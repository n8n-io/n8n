import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSetupRequest } from '../__tests__/factories';
import { useWorkflowSetupCards } from './useWorkflowSetupCards';

const credentialsStore = vi.hoisted(() => ({
	allCredentials: [] as Array<{ id: string; type: string; name: string }>,
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => credentialsStore,
}));

describe('useWorkflowSetupCards', () => {
	beforeEach(() => {
		credentialsStore.allCredentials = [];
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
