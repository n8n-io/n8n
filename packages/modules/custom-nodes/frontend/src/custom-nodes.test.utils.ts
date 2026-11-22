import type {
	CustomActionDraft,
	CustomActionResponse,
	CustomNodeResponse,
	ParentCustomActionResponse,
} from '@n8n/api-types';

export const createDraft = (overrides: Partial<CustomActionDraft> = {}): CustomActionDraft => ({
	name: 'Send message',
	inputs: [],
	request: { method: 'GET', url: '/ping', headers: {}, query: {}, bodyType: 'none', body: {} },
	...overrides,
});

export const createAction = (
	overrides: Partial<CustomActionResponse> = {},
): CustomActionResponse => ({
	id: 'action-1',
	name: 'Send message',
	parentNodeType: null,
	customNodeId: 'node-1',
	newestVersion: 1,
	versions: [],
	draft: createDraft(),
	...overrides,
});

export const createNode = (overrides: Partial<CustomNodeResponse> = {}): CustomNodeResponse => ({
	id: 'node-1',
	nodeType: 'n8n-custom.acme',
	displayName: 'Acme',
	baseUrl: 'https://api.acme.test',
	auth: { kind: 'none' },
	hasIcon: false,
	actions: [createAction()],
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides,
});

export const createParentAction = (
	overrides: Partial<ParentCustomActionResponse> = {},
): ParentCustomActionResponse => ({
	...createAction({ id: 'parent-action-1', name: 'Archive channel', customNodeId: null }),
	parentNodeType: 'n8n-nodes-base.slack',
	parentAvailable: true,
	...overrides,
});
