import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSetupRequest } from '../__tests__/factories';
import { useWorkflowSetupCards } from './useWorkflowSetupCards';

const credentialsStore = vi.hoisted(() => ({
	allCredentials: [] as Array<{ id: string; type: string; name: string }>,
}));

const nodeTypesStore = vi.hoisted(() => ({
	getNodeType: vi.fn((): unknown => null),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => credentialsStore,
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => nodeTypesStore,
}));

describe('useWorkflowSetupCards', () => {
	beforeEach(() => {
		credentialsStore.allCredentials = [];
		nodeTypesStore.getNodeType.mockReset();
		nodeTypesStore.getNodeType.mockReturnValue(null);
	});

	it('skips setup requests without a credential type', () => {
		const setupRequests = ref([
			makeSetupRequest({ credentialType: undefined }),
			makeSetupRequest({ credentialType: 'httpBasicAuth' }),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(1);
		expect(cards.value[0].credentialType).toBe('httpBasicAuth');
	});

	it('creates cards for editable parameter-only setup requests', () => {
		const setupRequests = ref([
			makeSetupRequest({
				credentialType: undefined,
				parameterIssues: { url: ['URL is required'] },
				editableParameters: [{ name: 'url', displayName: 'URL', type: 'string' }],
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(1);
		expect(cards.value[0]).toMatchObject({
			id: 'HTTP Request:parameters',
			parameterNames: ['url'],
		});
		expect(cards.value[0].credentialType).toBeUndefined();
	});

	it('does not create parameter-only cards for non-editable issues', () => {
		const setupRequests = ref([
			makeSetupRequest({
				credentialType: undefined,
				parameterIssues: { url: ['URL is required'] },
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(0);
	});

	it('resolves hidden parameter defaults from the node type', () => {
		nodeTypesStore.getNodeType.mockReturnValue({
			name: 'n8n-nodes-base.httpRequest',
			properties: [
				{ displayName: 'Method', name: 'method', type: 'options', default: 'GET' },
				{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			],
		});
		const setupRequests = ref([
			makeSetupRequest({
				credentialType: undefined,
				parameterIssues: { url: ['URL is required'] },
				editableParameters: [{ name: 'url', displayName: 'URL', type: 'string' }],
				node: { parameters: { url: '' } },
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value[0].node.parameters).toMatchObject({ method: 'GET', url: '' });
	});

	it('uses a stable node-name and credential-type id', () => {
		const setupRequests = ref([
			makeSetupRequest({
				credentialType: 'slackApi',
				node: { name: 'Slack' },
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value[0]).toMatchObject({
			id: 'Slack:slackApi',
			credentialType: 'slackApi',
			targetNodeName: 'Slack',
		});
	});

	it('prefers the credential already assigned on the node', () => {
		credentialsStore.allCredentials = [
			{ id: 'store-cred', type: 'httpBasicAuth', name: 'Store credential' },
		];
		const setupRequests = ref([
			makeSetupRequest({
				credentialType: 'httpBasicAuth',
				node: {
					credentials: {
						httpBasicAuth: { id: 'node-cred', name: 'Node credential' },
					},
				},
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value[0].currentCredentialId).toBe('node-cred');
	});

	it('does not preselect unrelated store credentials', () => {
		credentialsStore.allCredentials = [
			{ id: 'other-cred', type: 'slackApi', name: 'Slack credential' },
			{ id: 'matching-cred', type: 'httpBasicAuth', name: 'HTTP credential' },
		];
		const setupRequests = ref([makeSetupRequest({ credentialType: 'httpBasicAuth' })]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value[0].currentCredentialId).toBeNull();
	});

	it('uses null when no assigned or matching store credential exists', () => {
		credentialsStore.allCredentials = [
			{ id: 'other-cred', type: 'slackApi', name: 'Slack credential' },
		];
		const setupRequests = ref([makeSetupRequest({ credentialType: 'httpBasicAuth' })]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value[0].currentCredentialId).toBeNull();
	});

	it('updates when setup requests change', () => {
		const setupRequests = ref([makeSetupRequest({ credentialType: 'httpBasicAuth' })]);
		const { cards } = useWorkflowSetupCards(setupRequests);

		setupRequests.value = [
			makeSetupRequest({ credentialType: 'slackApi', node: { name: 'Slack' } }),
		];

		expect(cards.value).toHaveLength(1);
		expect(cards.value[0]).toMatchObject({
			id: 'Slack:slackApi',
			credentialType: 'slackApi',
		});
	});

	it('groups cred-only requests with the same credential type into one primary card', () => {
		const setupRequests = ref([
			makeSetupRequest({ node: { id: 'first', name: 'First' } }),
			makeSetupRequest({ node: { id: 'second', name: 'Second' } }),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(1);
		expect(cards.value[0]).toMatchObject({ id: 'First:httpBasicAuth', targetNodeName: 'First' });
		expect(cards.value[0].credentialTargetNodes).toEqual([
			{ id: 'first', name: 'First', type: 'n8n-nodes-base.httpRequest' },
			{ id: 'second', name: 'Second', type: 'n8n-nodes-base.httpRequest' },
		]);
	});

	it('creates one primary per credential type', () => {
		const setupRequests = ref([
			makeSetupRequest({ credentialType: 'httpBasicAuth', node: { id: 'first', name: 'First' } }),
			makeSetupRequest({ credentialType: 'slackApi', node: { id: 'second', name: 'Second' } }),
			makeSetupRequest({ credentialType: 'httpBasicAuth', node: { id: 'third', name: 'Third' } }),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(2);
		expect(cards.value.map((card) => card.credentialType)).toEqual(['httpBasicAuth', 'slackApi']);
		expect(cards.value[0].credentialTargetNodes.map((target) => target.name)).toEqual([
			'First',
			'Third',
		]);
		expect(cards.value[1].credentialTargetNodes.map((target) => target.name)).toEqual(['Second']);
	});

	it('groups a cred-only follower into a primary card that has parameters', () => {
		const setupRequests = ref([
			makeSetupRequest({
				node: { id: 'primary', name: 'Primary' },
				editableParameters: [{ name: 'url', displayName: 'URL', type: 'string' }],
			}),
			makeSetupRequest({ node: { id: 'follower', name: 'Follower' } }),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(1);
		expect(cards.value[0].parameterNames).toEqual(['url']);
		expect(cards.value[0].credentialTargetNodes.map((target) => target.name)).toEqual([
			'Primary',
			'Follower',
		]);
	});

	it('keeps a params-bearing follower independent from a cred-only primary', () => {
		const setupRequests = ref([
			makeSetupRequest({ node: { id: 'primary', name: 'Primary' } }),
			makeSetupRequest({
				node: { id: 'follower', name: 'Follower' },
				editableParameters: [{ name: 'url', displayName: 'URL', type: 'string' }],
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(2);
		expect(cards.value[0].credentialTargetNodes.map((target) => target.name)).toEqual(['Primary']);
		expect(cards.value[1].parameterNames).toEqual(['url']);
		expect(cards.value[1].credentialTargetNodes.map((target) => target.name)).toEqual(['Follower']);
	});

	it('keeps params-bearing requests with the same credential type independent', () => {
		const setupRequests = ref([
			makeSetupRequest({
				node: { id: 'primary', name: 'Primary' },
				editableParameters: [{ name: 'url', displayName: 'URL', type: 'string' }],
			}),
			makeSetupRequest({
				node: { id: 'follower', name: 'Follower' },
				editableParameters: [{ name: 'path', displayName: 'Path', type: 'string' }],
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(2);
		expect(cards.value[0].credentialTargetNodes.map((target) => target.name)).toEqual(['Primary']);
		expect(cards.value[1].credentialTargetNodes.map((target) => target.name)).toEqual(['Follower']);
	});

	it('groups HTTP requests by the same literal URL and splits different URLs', () => {
		const setupRequests = ref([
			makeSetupRequest({
				node: { id: 'first', name: 'First', parameters: { url: 'https://a.test' } },
			}),
			makeSetupRequest({
				node: { id: 'second', name: 'Second', parameters: { url: 'https://a.test' } },
			}),
			makeSetupRequest({
				node: { id: 'third', name: 'Third', parameters: { url: 'https://b.test' } },
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(2);
		expect(cards.value[0].credentialTargetNodes.map((target) => target.name)).toEqual([
			'First',
			'Second',
		]);
		expect(cards.value[1].credentialTargetNodes.map((target) => target.name)).toEqual(['Third']);
	});

	it('splits HTTP expression URLs per node even when the expression string matches', () => {
		const setupRequests = ref([
			makeSetupRequest({
				node: { id: 'first', name: 'First', parameters: { url: '={{ $json.url }}' } },
			}),
			makeSetupRequest({
				node: { id: 'second', name: 'Second', parameters: { url: '={{ $json.url }}' } },
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(2);
		expect(cards.value[0].credentialTargetNodes.map((target) => target.name)).toEqual(['First']);
		expect(cards.value[1].credentialTargetNodes.map((target) => target.name)).toEqual(['Second']);
	});

	it('groups HTTP requests with missing or non-string URLs', () => {
		const setupRequests = ref([
			makeSetupRequest({ node: { id: 'first', name: 'First', parameters: {} } }),
			makeSetupRequest({ node: { id: 'second', name: 'Second', parameters: { url: 123 } } }),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(1);
		expect(cards.value[0].credentialTargetNodes.map((target) => target.name)).toEqual([
			'First',
			'Second',
		]);
	});

	it('groups non-HTTP requests only by credential type', () => {
		const setupRequests = ref([
			makeSetupRequest({
				node: { id: 'first', name: 'First', type: 'n8n-nodes-base.slack' },
				credentialType: 'slackApi',
			}),
			makeSetupRequest({
				node: { id: 'second', name: 'Second', type: 'n8n-nodes-base.slack' },
				credentialType: 'slackApi',
			}),
		]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value).toHaveLength(1);
		expect(cards.value[0].credentialTargetNodes.map((target) => target.name)).toEqual([
			'First',
			'Second',
		]);
	});
});
