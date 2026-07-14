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

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { NodeTypes } from '@/node-types';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';

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

	private getNodeDescription(nodeType: string, version: number): INodeTypeDescription | undefined {
		try {
			return this.nodeTypes.getByNameAndVersion(nodeType, version).description;
		} catch {
			return undefined;
		}
	}
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
