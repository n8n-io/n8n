import type { CredentialRestriction } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { CredentialRestrictionsProvider, CredentialToJudge } from '@n8n/backend-services';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Service } from '@n8n/di';
import { HTTP_REQUEST_NODE_TYPE, type ICredentialType } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';

import { toAvailabilityEntry } from './availability-entry';
import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from './constants';
import {
	TypeAvailabilityPolicyService,
	type AllProjectsEvaluation,
	type ComposedTypeVerdict,
} from './type-availability-policy.service';

const HTTP_REQUEST_OAUTH_PARENTS = ['oAuth2Api', 'oAuth1Api'];

type VerdictsByName = ReadonlyMap<string, ComposedTypeVerdict>;

const byName = (verdicts: ComposedTypeVerdict[]): VerdictsByName =>
	new Map(verdicts.map((verdict) => [verdict.name, verdict]));

const isDenied = (verdict: ComposedTypeVerdict | undefined): verdict is ComposedTypeVerdict =>
	verdict?.action === 'deny';

/** A project without a policy of its own gets the verdicts that every such project shares. */
function verdictsReader({ withoutProjectPolicy, byProject }: AllProjectsEvaluation) {
	const shared = byName(withoutProjectPolicy);
	const byProjectId = new Map(
		byProject.map(({ projectId, verdicts }) => [projectId, byName(verdicts)]),
	);

	return (projectId: string | null): VerdictsByName =>
		(projectId === null ? undefined : byProjectId.get(projectId)) ?? shared;
}

/**
 * Judges the credentials of a list against the policy of the project given for each one: the
 * listed project, or else its home project. Like the restricted node filter of the workflow
 * list, it evaluates every project in one pass, so a list with many projects costs no extra
 * queries.
 */
@Service()
export class CredentialTypePolicyRestrictionsProvider implements CredentialRestrictionsProvider {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly licenseState: LicenseState,
		private readonly credentialTypes: CredentialTypes,
	) {}

	async findRestrictions(
		credentials: CredentialToJudge[],
	): Promise<Array<CredentialRestriction | null>> {
		const none = credentials.map(() => null);
		if (!this.licenseState.isLicensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)) return none;

		// A type whose package is not loaded has no known nodes, but its own policy still applies.
		const supportedNodesByType = new Map(
			[...new Set(credentials.map(({ type }) => type))].map((type) => [
				type,
				this.credentialTypes.recognizes(type) ? this.credentialTypes.getSupportedNodes(type) : [],
			]),
		);
		if (supportedNodesByType.size === 0) return none;

		const nodeTypes = new Set([
			HTTP_REQUEST_NODE_TYPE,
			...[...supportedNodesByType.values()].flat(),
		]);
		const [credentialEvaluation, nodeEvaluation] = await Promise.all([
			this.service.evaluateComposedTypesForAllProjects(CREDENTIAL_TYPES_KIND, [
				...supportedNodesByType.keys(),
			]),
			this.service.evaluateComposedTypesForAllProjects(NODE_TYPES_KIND, [...nodeTypes]),
		]);
		const credentialVerdictsOf = verdictsReader(credentialEvaluation);
		const nodeVerdictsOf = verdictsReader(nodeEvaluation);
		const usableByHttpRequest = new Map<string, boolean>();

		return credentials.map(({ type, projectId }) => {
			return this.judge(
				type,
				supportedNodesByType.get(type) ?? [],
				credentialVerdictsOf(projectId),
				nodeVerdictsOf(projectId),
				usableByHttpRequest,
			);
		});
	}

	/** Mirrors `useCredentialTypeUsability` in the editor, which judges the new credential picker. */
	private judge(
		type: string,
		supportedNodes: string[],
		credentialVerdicts: VerdictsByName,
		nodeVerdicts: VerdictsByName,
		usableByHttpRequest: Map<string, boolean>,
	): CredentialRestriction | null {
		const typeVerdict = credentialVerdicts.get(type);
		if (isDenied(typeVerdict)) {
			return { reason: 'typeRestricted', restriction: toAvailabilityEntry(typeVerdict) };
		}

		if (supportedNodes.length === 0) return null;

		const denied: ComposedTypeVerdict[] = [];
		for (const nodeType of supportedNodes) {
			const verdict = nodeVerdicts.get(nodeType);
			if (!isDenied(verdict)) return null;
			denied.push(verdict);
		}

		if (
			!isDenied(nodeVerdicts.get(HTTP_REQUEST_NODE_TYPE)) &&
			this.isUsableByHttpRequest(type, supportedNodes, usableByHttpRequest)
		) {
			return null;
		}

		const restriction =
			denied.find((verdict) => verdict.scope === 'project' || verdict.optInAvailable) ?? denied[0];

		return {
			reason: 'nodesRestricted',
			restriction: toAvailabilityEntry(restriction),
			nodeTypes: supportedNodes,
		};
	}

	/**
	 * Whether HTTP Request offers the type as a predefined credential: it extends OAuth1 or
	 * OAuth2, or it authenticates requests itself. Mirrors `isCredentialTypeSupported` in the
	 * editor.
	 */
	private isUsableByHttpRequest(
		type: string,
		supportedNodes: string[],
		cache: Map<string, boolean>,
	): boolean {
		// It can load the type description, so each type is checked once a request.
		const cached = cache.get(type);
		if (cached !== undefined) return cached;

		const usable = this.checkUsableByHttpRequest(type, supportedNodes);
		cache.set(type, usable);
		return usable;
	}

	private checkUsableByHttpRequest(type: string, supportedNodes: string[]): boolean {
		const definition = this.definitionOf(type);
		if (!definition || definition.hidden) return false;
		if (definition.restrictToSupportedNodes && !supportedNodes.includes(HTTP_REQUEST_NODE_TYPE)) {
			return false;
		}

		const parents = this.credentialTypes.getParentTypes(type);
		if (parents.some((parent) => HTTP_REQUEST_OAUTH_PARENTS.includes(parent))) return true;

		return [definition, ...parents.map((parent) => this.definitionOf(parent))].some(
			(candidate) => candidate?.authenticate !== undefined && candidate.genericAuth !== true,
		);
	}

	private definitionOf(type: string): ICredentialType | undefined {
		try {
			return this.credentialTypes.getByName(type);
		} catch {
			return undefined;
		}
	}
}
