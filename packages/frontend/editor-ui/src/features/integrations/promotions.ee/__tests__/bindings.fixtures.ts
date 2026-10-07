import type {
	AppliedResult,
	BlockedApplyResult,
	CreatedPromotionBinding,
	MissingPromotionBinding,
} from '../promotions.types';

export const consumers = [
	{ project: { id: 'team-a', name: 'Team A' }, workflows: [{ id: 'wf-a', name: 'Workflow A' }] },
	{ project: { id: 'team-b', name: 'Team B' }, workflows: [{ id: 'wf-b', name: 'Workflow B' }] },
];

export const credential: Extract<MissingPromotionBinding, { kind: 'credential' }> = {
	kind: 'credential',
	sourceId: 'credential-id',
	name: 'Source credential',
	credentialType: 'httpHeaderAuth',
	ownerProject: { id: 'owner-team', name: 'Owner team' },
	expressionData: { value: '={{ $vars.SECRET }}' },
	consumers,
};

export const variable: Extract<MissingPromotionBinding, { kind: 'variable' }> = {
	kind: 'variable',
	name: 'SETTING',
	variableType: 'string',
	scope: { kind: 'global' },
	sourceValue: 'private-value',
	consumers: [consumers[0]],
};

export const savedCredential: Extract<CreatedPromotionBinding, { kind: 'credential' }> = {
	kind: 'credential',
	sourceId: credential.sourceId,
	id: credential.sourceId,
	name: 'Destination credential',
	credentialType: credential.credentialType,
	projectId: credential.ownerProject.id,
};

export function blocked(
	preflight: Partial<BlockedApplyResult['preflight']> = {},
): BlockedApplyResult {
	return {
		status: 'blocked',
		connectionId: 'connection-id',
		configId: 'config-id',
		git: { branchName: 'main', commitSha: 'a'.repeat(40) },
		preflight: {
			missingProjects: [],
			missingBindings: [credential],
			accessRequirements: [],
			conflicts: [],
			warnings: [],
			...preflight,
		},
	};
}

export const applied: AppliedResult = {
	status: 'applied',
	connectionId: 'connection-id',
	configId: 'config-id',
	git: { branchName: 'main', commitSha: 'a'.repeat(40) },
	counts: {
		projects: { created: 0, updated: 1, skipped: 1, deleted: 0 },
		folders: { created: 0, skipped: 0, removed: 0 },
		workflows: {
			created: 1,
			updated: 2,
			skipped: 1,
			archived: 0,
			deleted: 0,
			publishing: { published: 0, unpublished: 0, unchanged: 0, blocked: 1, failed: 1 },
		},
		credentials: { matched: 1, stubbed: 0 },
		dataTables: { matched: 0, created: 0 },
		variables: { matched: 0, created: 0, updated: 0, stubbed: 0, missing: 0 },
		tags: { matched: 0, created: 0, renamed: 0, reconciled: 0, skipped: 0 },
	},
	warnings: [
		{
			kind: 'variable',
			code: 'variable-shadowed',
			name: 'SETTING',
			scope: { kind: 'global' },
			consumers,
		},
	],
};
