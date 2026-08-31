import { Logger } from '@n8n/backend-common';
import { detectAuthenticationParameterValue } from '@n8n/ai-utilities/node-catalog';
import { ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExploreResourcesParams, ExploreResourcesResult } from '@n8n/instance-ai';
import type {
	INodeCredentials,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyMode,
	INodePropertyOptions,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { NodeTypes } from '@/node-types';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';

/**
 * How far `findUnavailableResourceLocatorValues` will page before giving up on
 * validating a parameter. Bounds the worst case (an account with thousands of
 * resources) while still covering the small, complete lists — model catalogues,
 * channel lists — where a stale value is actually worth reporting.
 */
const MAX_AVAILABILITY_PAGES = 5;

/**
 * Looks up dynamic resource locator and load-options values for a node on
 * behalf of a user, after verifying credential ownership.
 *
 * Shared between Instance AI (`InstanceAiAdapterService.exploreResources`)
 * and the public MCP `explore_node_resources` tool.
 */
@Service()
export class NodeResourceExplorerService {
	constructor(
		private readonly logger: Logger,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly projectRepository: ProjectRepository,
		private readonly nodeTypes: NodeTypes,
	) {}

	async exploreResources(
		user: User,
		params: ExploreResourcesParams,
	): Promise<ExploreResourcesResult> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			params.credentialId,
			user,
			['credential:read'],
		);
		if (!credential || credential.type !== params.credentialType) {
			throw new Error(`Credential ${params.credentialId} not found or not accessible`);
		}
		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);

		const nodeTypeAndVersion = { name: params.nodeType, version: params.version };
		const currentNodeParameters = structuredClone(
			params.currentNodeParameters ?? {},
		) as INodeParameters;
		const credentials: INodeCredentials = {
			[credential.type]: { id: credential.id, name: credential.name },
		};

		const nodeDescription = this.getNodeDescription(params.nodeType, params.version);

		// `getNodeParameter('authentication', 0)` falls back to the wrong default when
		// the parameter isn't set — pre-fill it so cred-resolution picks the right slot.
		if (!currentNodeParameters.authentication && nodeDescription) {
			const authValue = detectAuthenticationParameterValue(nodeDescription, params.credentialType);
			if (authValue !== undefined) currentNodeParameters.authentication = authValue;
		}

		const additionalData = await getBase({
			userId: user.id,
			projectId: personalProject.id,
			currentNodeParameters,
		});

		// Look up the property's builderHint so the agent sees selection guidance
		// alongside the raw list. This makes the hint reachable even when the
		// agent jumps straight to explore-resources without reading type-definition.
		const builderHint = nodeDescription
			? findBuilderHintForMethod(nodeDescription, params.methodName, params.methodType)
			: undefined;

		try {
			if (params.methodType === 'listSearch') {
				const result = await this.dynamicNodeParametersService.getResourceLocatorResults(
					params.methodName,
					'',
					additionalData,
					nodeTypeAndVersion,
					currentNodeParameters,
					credentials,
					params.filter,
					params.paginationToken,
				);
				return {
					results: (result.results ?? []).map((r) => ({
						name: String(r.name),
						value: r.value,
						url: r.url,
					})),
					paginationToken:
						typeof result.paginationToken === 'string' ? result.paginationToken : undefined,
					...(builderHint ? { builderHint } : {}),
				};
			}

			const options = await this.dynamicNodeParametersService.getOptionsViaMethodName(
				params.methodName,
				'',
				additionalData,
				nodeTypeAndVersion,
				currentNodeParameters,
				credentials,
			);
			return {
				results: options.map((o) => ({
					name: String(o.name),
					value: o.value,
					description: o.description,
				})),
				...(builderHint ? { builderHint } : {}),
			};
		} catch (error) {
			this.logger.error('Failed to load options for explore-resources', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Check the node's resource-locator parameters against what the given credential
	 * can actually reach, and report the ones whose current value isn't available.
	 *
	 * Exists because a credential can narrow the value space of a parameter that was
	 * chosen before it was connected: the free-OpenAI-credits credential proxies
	 * `GET /v1/models` through a filtered allowlist, so a model the builder picked at
	 * build time (when no credential existed) may simply not be callable. A user's own
	 * key can be restricted the same way by their org's model access, so this isn't
	 * limited to managed credentials.
	 *
	 * Reports the unusable value only — not a replacement, and not the usable values.
	 * Callers that want those can list them through `exploreResources`, which runs the
	 * same lookup.
	 *
	 * Two things bound what this will claim, because a false "your value is invalid" is
	 * worse than staying quiet:
	 *
	 * - Only values that are **comparable to the list** are checked: a literal identifier in a
	 *   locator's `list` or `id` mode. `url` mode stores a URL and expressions resolve at
	 *   runtime, so neither can be matched against a catalogue of ids; a free-text parameter
	 *   has no enumerable value space at all.
	 * - Only **exhaustive** lists are trusted. A partial result tells us what's on the
	 *   pages we fetched, not what exists — a user with thousands of spreadsheets would
	 *   otherwise have a perfectly good `documentId` flagged because it sorted too low.
	 *   Paginated lists are followed up to `MAX_AVAILABILITY_PAGES`; beyond that the
	 *   parameter is left unvalidated rather than judged on a partial view.
	 *
	 * Each page costs a live provider round trip, so this is not free; it is the same
	 * call a resource-locator dropdown makes when it is opened.
	 */
	async findUnavailableResourceLocatorValues(
		user: User,
		params: {
			nodeType: string;
			version: number;
			credentialType: string;
			credentialId: string;
			parameters: Record<string, unknown>;
		},
	): Promise<UnavailableResourceLocatorValue[]> {
		const nodeDescription = this.getNodeDescription(params.nodeType, params.version);
		if (!nodeDescription) return [];

		const candidates = collectListBackedLocators(
			nodeDescription,
			params.parameters,
			params.version,
		);
		if (candidates.length === 0) return [];

		const unavailable: UnavailableResourceLocatorValue[] = [];
		for (const candidate of candidates) {
			const listing = await this.listAllReachableValues(user, params, candidate);

			// `complete: false` means we stopped early — a lookup error, or a list longer
			// than MAX_AVAILABILITY_PAGES. Either way we haven't seen everything, so we
			// can't call the value missing.
			if (!listing.complete) continue;
			// An empty list means the lookup told us nothing, not that the value is wrong.
			// (It also covers a credential that can reach no value of this kind at all,
			// where reporting the parameter gives the caller nothing to act on.)
			if (listing.options.length === 0) continue;
			if (listing.options.some((o) => o.value === candidate.currentValue)) continue;

			unavailable.push({
				name: candidate.name,
				displayName: candidate.displayName,
				currentValue: candidate.currentValue,
			});
		}

		return unavailable;
	}

	/**
	 * Page through everything the credential can reach for one locator parameter.
	 *
	 * `complete` is the load-bearing part of the return: it's true only when we reached
	 * the end of the list, which is the sole condition under which a missing value means
	 * anything. Bailing out early is always safe — the caller stays quiet — whereas
	 * treating a truncated list as complete would flag values that are perfectly fine.
	 */
	private async listAllReachableValues(
		user: User,
		params: {
			nodeType: string;
			version: number;
			credentialType: string;
			credentialId: string;
			parameters: Record<string, unknown>;
		},
		candidate: Pick<CandidateLocator, 'name' | 'methodName'>,
	): Promise<{ options: Array<{ name: string; value: string }>; complete: boolean }> {
		const byValue = new Map<string, { name: string; value: string }>();
		let paginationToken: string | undefined;

		for (let page = 0; page < MAX_AVAILABILITY_PAGES; page++) {
			let result;
			try {
				result = await this.exploreResources(user, {
					nodeType: params.nodeType,
					version: params.version,
					methodName: candidate.methodName,
					methodType: 'listSearch',
					credentialType: params.credentialType,
					credentialId: params.credentialId,
					currentNodeParameters: params.parameters,
					...(paginationToken ? { paginationToken } : {}),
				});
			} catch (error) {
				// One failure shouldn't hide the other parameters, and an unreachable
				// provider must not turn into a spurious "your value is invalid".
				this.logger.debug('Resource-locator availability check failed', {
					parameter: candidate.name,
					error: error instanceof Error ? error.message : String(error),
				});
				return { options: [], complete: false };
			}

			for (const entry of result.results) {
				const value = String(entry.value);
				if (!byValue.has(value)) byValue.set(value, { name: entry.name, value });
			}

			paginationToken = result.paginationToken;
			if (paginationToken === undefined) return { options: [...byValue.values()], complete: true };
		}

		// Deliberately not treated as complete: a long list stays unvalidated rather than
		// producing false "unavailable" reports from a partial view.
		this.logger.debug('Resource-locator list too long to validate against', {
			parameter: candidate.name,
			pagesFetched: MAX_AVAILABILITY_PAGES,
			valuesSeen: byValue.size,
		});
		return { options: [...byValue.values()], complete: false };
	}

	private getNodeDescription(nodeType: string, version: number): INodeTypeDescription | undefined {
		try {
			return this.nodeTypes.getByNameAndVersion(nodeType, version).description;
		} catch {
			return undefined;
		}
	}
}

/**
 * A resource-locator value the credential can't reach. Identifies the parameter and the
 * offending value only — the reachable values are gathered internally to decide that, but
 * deliberately not returned: callers that want them can list them with `exploreResources`.
 */
export interface UnavailableResourceLocatorValue {
	/** Parameter name, as declared by the node. */
	name: string;
	displayName: string;
	/** The configured value the credential can't reach. Left in place; repair is the caller's. */
	currentValue: string;
}

interface CandidateLocator {
	name: string;
	displayName: string;
	methodName: string;
	currentValue: string;
}

/** Locator modes whose stored value is the resource identifier itself. */
const IDENTIFIER_LOCATOR_MODES = new Set(['list', 'id']);

/**
 * The value a resource-locator holds, when that value is comparable to the list.
 *
 * `list` and `id` both store the identifier, so either can be checked against the
 * catalogue: whether someone picked `gpt-6-mini` from a dropdown or typed it in, the
 * credential still can't call it. Other modes are skipped because their value isn't an
 * identifier at all — `url` mode stores a URL and the node extracts the id from it at
 * runtime, so comparing it to a list of ids would mismatch every single time.
 *
 * A bare string is the identifier too, and is treated the same.
 *
 * Expressions are skipped whatever the mode: `={{ $json.model }}` resolves per item at
 * runtime, so there is no single value to look up, and comparing the expression text to a
 * catalogue would mismatch every time. Reporting it would invite the caller to replace a
 * deliberate dynamic value with a static one. This mirrors `validateResourceLocatorParameter`
 * in n8n-workflow, which returns no errors as soon as the value starts with `=`.
 *
 * What keeps a typed-in id from being falsely reported is not the mode but the guards on
 * the list itself: a partial, empty or failed lookup never yields a verdict. The residual
 * risk is a provider whose catalogue endpoint looks complete but isn't — an
 * OpenAI-compatible proxy behind a custom `baseURL`, say — where a legitimately callable
 * model could be reported. Accepted, because the alternative is not catching the values
 * the builder invents, which is the point of the check.
 */
function readLocatorValue(raw: unknown): string | undefined {
	if (typeof raw === 'string') return staticIdentifier(raw);
	if (typeof raw !== 'object' || raw === null) return undefined;

	const mode = Reflect.get(raw, 'mode');
	if (typeof mode === 'string' && !IDENTIFIER_LOCATOR_MODES.has(mode)) return undefined;

	const value = Reflect.get(raw, 'value');
	if (typeof value === 'string') return staticIdentifier(value);
	if (typeof value === 'number') return String(value);
	return undefined;
}

/** A value only counts when it's a literal identifier — not empty, and not an expression. */
function staticIdentifier(value: string): string | undefined {
	if (value === '') return undefined;
	if (value.startsWith('=')) return undefined;
	return value;
}

/**
 * Resource-locator properties that resolve their `list` mode through a search method,
 * are visible for the node's current parameters, and hold a concrete value — the only
 * ones whose value can be checked against a credential.
 *
 * The visibility filter is essential, not tidiness. A node can declare the same locator
 * many times over, once per resource/operation branch, each pointing at a different
 * search method: the OpenAI node's `modelRLC` yields five `modelId` locators backed by
 * `modelSearch`, `imageModelSearch`, `imageGenerateModelSearch` and `videoModelSearch`.
 * Probing all of them would spend a provider call apiece and, worse, judge the active
 * value against another branch's list — a chat model is legitimately absent from the
 * video-model list, so it would be reported as unusable.
 *
 * Values are resolved through `getNodeParameters` first so branch discriminators left at
 * their defaults (n8n strips those on save) still resolve, and so hidden parameters are
 * dropped the same way execution drops them.
 */
function collectListBackedLocators(
	nodeDescription: INodeTypeDescription,
	parameters: Record<string, unknown>,
	typeVersion: number,
): Array<CandidateLocator> {
	const node = { typeVersion };
	const resolved =
		NodeHelpers.getNodeParameters(
			nodeDescription.properties,
			parameters as INodeParameters,
			true,
			false,
			node,
			nodeDescription,
		) ?? (parameters as INodeParameters);

	const candidates: CandidateLocator[] = [];
	const seen = new Set<string>();

	for (const property of nodeDescription.properties) {
		if (property.type !== 'resourceLocator') continue;
		if (seen.has(property.name)) continue;

		const methodName = property.modes?.reduce<string | undefined>(
			(found, mode: INodePropertyMode) =>
				found ?? (mode.type === 'list' ? mode.typeOptions?.searchListMethod : undefined),
			undefined,
		);
		if (!methodName) continue;

		if (!NodeHelpers.displayParameter(resolved, property, node, nodeDescription)) continue;

		const currentValue = readLocatorValue(resolved[property.name]);
		if (currentValue === undefined) continue;

		seen.add(property.name);
		candidates.push({
			name: property.name,
			displayName: property.displayName,
			methodName,
			currentValue,
		});
	}

	return candidates;
}

/**
 * Find the `builderHint.propertyHint` of the property that references a given
 * method name via `@searchListMethod` (RLC list modes) or `@loadOptionsMethod`.
 * Returns undefined if no matching property is found.
 */
function findBuilderHintForMethod(
	nodeDesc: INodeTypeDescription,
	methodName: string,
	methodType: 'listSearch' | 'loadOptions',
): string | undefined {
	const referencesMethod = (prop: INodeProperties): boolean => {
		switch (methodType) {
			case 'loadOptions':
				return prop.typeOptions?.loadOptionsMethod === methodName;
			case 'listSearch': {
				const modes: INodePropertyMode[] = prop.modes ?? [];
				return modes.some((mode) => mode.typeOptions?.searchListMethod === methodName);
			}
		}
	};

	const isCollection = (
		item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
	): item is INodePropertyCollection => 'values' in item;
	const isProperty = (
		item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
	): item is INodeProperties => 'type' in item;

	const searchProps = (
		items?: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>,
	): string | undefined => {
		for (const item of items ?? []) {
			if (isCollection(item)) {
				const nested = searchProps(item.values);
				if (nested) return nested;
				continue;
			}
			if (!isProperty(item)) continue;
			if (referencesMethod(item) && item.builderHint?.propertyHint) {
				return item.builderHint.propertyHint;
			}
			const nested = searchProps(item.options);
			if (nested) return nested;
		}
		return undefined;
	};

	return searchProps(nodeDesc.properties);
}
