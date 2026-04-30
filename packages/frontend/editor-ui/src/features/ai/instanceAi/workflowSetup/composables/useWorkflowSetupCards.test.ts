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

	it('falls back to the first store credential with the requested type', () => {
		credentialsStore.allCredentials = [
			{ id: 'other-cred', type: 'slackApi', name: 'Slack credential' },
			{ id: 'matching-cred', type: 'httpBasicAuth', name: 'HTTP credential' },
		];
		const setupRequests = ref([makeSetupRequest({ credentialType: 'httpBasicAuth' })]);

		const { cards } = useWorkflowSetupCards(setupRequests);

		expect(cards.value[0].currentCredentialId).toBe('matching-cred');
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
});
