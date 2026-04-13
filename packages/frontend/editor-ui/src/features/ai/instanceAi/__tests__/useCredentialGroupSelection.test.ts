import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { computed } from 'vue';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCredentialGroupSelection } from '../composables/useCredentialGroupSelection';
import type { SetupCard } from '../instanceAiWorkflowSetup.utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSetupNode(
	overrides: Partial<InstanceAiWorkflowSetupNode> = {},
): InstanceAiWorkflowSetupNode {
	return {
		node: {
			name: 'Slack',
			type: 'n8n-nodes-base.slack',
			typeVersion: 2,
			parameters: {},
			position: [0, 0] as [number, number],
			id: 'node-1',
		},
		isTrigger: false,
		...overrides,
	} as InstanceAiWorkflowSetupNode;
}

function makeCard(overrides: Partial<SetupCard> = {}): SetupCard {
	return {
		id: 'card-1',
		credentialType: 'slackApi',
		nodes: [makeSetupNode()],
		isTrigger: false,
		isFirstTrigger: false,
		isTestable: false,
		isAutoApplied: false,
		hasParamIssues: false,
		...overrides,
	};
}

describe('useCredentialGroupSelection', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let credentialsStore: ReturnType<typeof useCredentialsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		workflowsStore = useWorkflowsStore();
		credentialsStore = useCredentialsStore();
	});

	describe('initCredGroupSelections', () => {
		test('picks up existing credential from node', () => {
			const card = makeCard({
				nodes: [
					makeSetupNode({
						credentialType: 'slackApi',
						node: {
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							typeVersion: 2,
							parameters: {},
							position: [0, 0] as [number, number],
							id: 'node-1',
							credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
						},
					}),
				],
			});

			const cards = computed(() => [card]);
			const { initCredGroupSelections, getCardCredentialId } = useCredentialGroupSelection(
				cards,
				vi.fn(),
			);
			initCredGroupSelections();

			expect(getCardCredentialId(card)).toBe('cred-1');
		});

		test('auto-selects when single existing credential is available', () => {
			const card = makeCard({
				nodes: [
					makeSetupNode({
						credentialType: 'slackApi',
						existingCredentials: [{ id: 'cred-1', name: 'My Slack' }],
					}),
				],
			});

			const cards = computed(() => [card]);
			const { initCredGroupSelections, getCardCredentialId } = useCredentialGroupSelection(
				cards,
				vi.fn(),
			);
			initCredGroupSelections();

			expect(getCardCredentialId(card)).toBe('cred-1');
		});

		test('auto-selects first credential when auto-applied', () => {
			const card = makeCard({
				isAutoApplied: true,
				nodes: [
					makeSetupNode({
						credentialType: 'slackApi',
						existingCredentials: [
							{ id: 'cred-1', name: 'Slack 1' },
							{ id: 'cred-2', name: 'Slack 2' },
						],
					}),
				],
			});

			const cards = computed(() => [card]);
			const { initCredGroupSelections, getCardCredentialId } = useCredentialGroupSelection(
				cards,
				vi.fn(),
			);
			initCredGroupSelections();

			expect(getCardCredentialId(card)).toBe('cred-1');
		});

		test('returns null when no credential is available', () => {
			const card = makeCard({
				nodes: [makeSetupNode({ credentialType: 'slackApi' })],
			});

			const cards = computed(() => [card]);
			const { initCredGroupSelections, getCardCredentialId } = useCredentialGroupSelection(
				cards,
				vi.fn(),
			);
			initCredGroupSelections();

			expect(getCardCredentialId(card)).toBeNull();
		});
	});

	describe('setCredentialForGroup', () => {
		test('updates shared group state and syncs to store nodes', () => {
			const card = makeCard({
				nodes: [makeSetupNode({ credentialType: 'slackApi' })],
			});
			const storeNode = { name: 'Slack', credentials: {} };
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(storeNode);
			const mockGetById = (id: string) =>
				id === 'cred-2' ? { id: 'cred-2', name: 'New Slack' } : undefined;
			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getCredentialById', 'get').mockReturnValue(mockGetById);

			const testFn = vi.fn();
			const cards = computed(() => [card]);
			const { initCredGroupSelections, setCredentialForGroup, getCardCredentialId } =
				useCredentialGroupSelection(cards, testFn);
			initCredGroupSelections();

			setCredentialForGroup('slackApi', 'slackApi', 'cred-2');

			expect(getCardCredentialId(card)).toBe('cred-2');
			expect(storeNode.credentials).toEqual({
				slackApi: { id: 'cred-2', name: 'New Slack' },
			});
		});

		test('triggers background credential test', () => {
			const card = makeCard({
				nodes: [makeSetupNode({ credentialType: 'slackApi' })],
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(undefined);
			const mockGetById = () => ({ id: 'cred-2', name: 'New Slack' });
			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getCredentialById', 'get').mockReturnValue(mockGetById);

			const testFn = vi.fn().mockResolvedValue(undefined);
			const cards = computed(() => [card]);
			const { initCredGroupSelections, setCredentialForGroup } = useCredentialGroupSelection(
				cards,
				testFn,
			);
			initCredGroupSelections();

			setCredentialForGroup('slackApi', 'slackApi', 'cred-2');

			expect(testFn).toHaveBeenCalledWith('cred-2', 'New Slack', 'slackApi');
		});
	});

	describe('clearCredentialForGroup', () => {
		test('clears group state and removes credential from store nodes', () => {
			const card = makeCard({
				nodes: [makeSetupNode({ credentialType: 'slackApi' })],
			});
			const storeNode = {
				name: 'Slack',
				credentials: { slackApi: { id: 'cred-1', name: 'Old' } },
			};
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(storeNode);

			const cards = computed(() => [card]);
			const { initCredGroupSelections, clearCredentialForGroup, getCardCredentialId } =
				useCredentialGroupSelection(cards, vi.fn());
			initCredGroupSelections();

			clearCredentialForGroup('slackApi', 'slackApi');

			expect(getCardCredentialId(card)).toBeNull();
			expect(storeNode.credentials).not.toHaveProperty('slackApi');
		});
	});

	describe('isFirstCardInCredGroup', () => {
		test('returns true for the first card in a group', () => {
			const card1 = makeCard({ id: 'card-1', credentialType: 'slackApi' });
			const card2 = makeCard({ id: 'card-2', credentialType: 'slackApi' });
			const cards = computed(() => [card1, card2]);

			const { isFirstCardInCredGroup } = useCredentialGroupSelection(cards, vi.fn());

			expect(isFirstCardInCredGroup(card1)).toBe(true);
			expect(isFirstCardInCredGroup(card2)).toBe(false);
		});
	});

	describe('cardHasExistingCredentials', () => {
		test('returns true when node has existing credentials', () => {
			const card = makeCard({
				nodes: [
					makeSetupNode({
						credentialType: 'slackApi',
						existingCredentials: [{ id: 'cred-1', name: 'My Slack' }],
					}),
				],
			});
			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getUsableCredentialByType', 'get').mockReturnValue(() => []);

			const cards = computed(() => [card]);
			const { cardHasExistingCredentials } = useCredentialGroupSelection(cards, vi.fn());

			expect(cardHasExistingCredentials(card)).toBe(true);
		});

		test('returns false when no credentials exist', () => {
			const card = makeCard({
				nodes: [makeSetupNode({ credentialType: 'slackApi' })],
			});
			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getUsableCredentialByType', 'get').mockReturnValue(() => []);

			const cards = computed(() => [card]);
			const { cardHasExistingCredentials } = useCredentialGroupSelection(cards, vi.fn());

			expect(cardHasExistingCredentials(card)).toBe(false);
		});
	});
});
