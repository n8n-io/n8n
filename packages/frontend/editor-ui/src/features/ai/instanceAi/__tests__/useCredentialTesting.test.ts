import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCredentialTesting } from '../composables/useCredentialTesting';
import type { SetupCard } from '../instanceAiWorkflowSetup.utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<SetupCard> = {}): SetupCard {
	return {
		id: 'card-1',
		credentialType: 'slackApi',
		nodes: [
			{
				node: {
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					parameters: {},
					position: [0, 0] as [number, number],
					id: 'node-1',
					credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
				},
				isTrigger: false,
			},
		],
		isTrigger: false,
		isFirstTrigger: false,
		isTestable: false,
		isAutoApplied: false,
		hasParamIssues: false,
		...overrides,
	} as SetupCard;
}

describe('useCredentialTesting', () => {
	let credentialsStore: ReturnType<typeof useCredentialsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		credentialsStore = useCredentialsStore();
	});

	describe('testCredentialInBackground', () => {
		function setupTestableType() {
			const mockType = {
				name: 'slackApi',
				displayName: 'Slack API',
				properties: [],
				test: { request: { method: 'GET', url: '/test' } },
			};
			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getCredentialTypeByName', 'get').mockReturnValue(() => mockType);
		}

		test('writes error to store when getCredentialData throws', async () => {
			setupTestableType();
			vi.spyOn(credentialsStore, 'isCredentialTestedOk').mockReturnValue(false);
			vi.spyOn(credentialsStore, 'isCredentialTestPending').mockReturnValue(false);
			vi.spyOn(credentialsStore, 'getCredentialData').mockRejectedValue(new Error('Network error'));

			const { testCredentialInBackground } = useCredentialTesting(() => null);
			await testCredentialInBackground('cred-1', 'My Slack', 'slackApi');

			// Should write 'error' to prevent stuck spinner
			expect(credentialsStore.credentialTestResults.get('cred-1')).toBe('error');
		});

		test('writes error to store when testCredential throws', async () => {
			setupTestableType();
			vi.spyOn(credentialsStore, 'isCredentialTestedOk').mockReturnValue(false);
			vi.spyOn(credentialsStore, 'isCredentialTestPending').mockReturnValue(false);
			vi.spyOn(credentialsStore, 'getCredentialData').mockResolvedValue({
				data: { apiKey: 'test-key' },
			} as never);
			vi.spyOn(credentialsStore, 'testCredential').mockRejectedValue(new Error('Test failed'));

			const { testCredentialInBackground } = useCredentialTesting(() => null);
			await testCredentialInBackground('cred-1', 'My Slack', 'slackApi');

			expect(credentialsStore.credentialTestResults.get('cred-1')).toBe('error');
		});

		test('skips already-successful credentials', async () => {
			setupTestableType();
			vi.spyOn(credentialsStore, 'isCredentialTestedOk').mockReturnValue(true);
			const getDataSpy = vi.spyOn(credentialsStore, 'getCredentialData');

			const { testCredentialInBackground } = useCredentialTesting(() => null);
			await testCredentialInBackground('cred-1', 'My Slack', 'slackApi');

			expect(getDataSpy).not.toHaveBeenCalled();
		});

		test('skips non-testable credential types', async () => {
			const mockType = { name: 'slackOAuth2Api', displayName: 'Slack OAuth2', properties: [] };
			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getCredentialTypeByName', 'get').mockReturnValue(() => mockType);
			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getNodesWithAccess', 'get').mockReturnValue(() => []);
			const getDataSpy = vi.spyOn(credentialsStore, 'getCredentialData');

			const { testCredentialInBackground } = useCredentialTesting(() => null);
			await testCredentialInBackground('cred-1', 'My Slack', 'slackOAuth2Api');

			expect(getDataSpy).not.toHaveBeenCalled();
		});
	});

	describe('getCredTestIcon', () => {
		test('returns null when card has no credential type', () => {
			const { getCredTestIcon } = useCredentialTesting(() => null);
			const card = makeCard({ credentialType: undefined });
			expect(getCredTestIcon(card)).toBeNull();
		});

		test('returns null when no credential is selected', () => {
			const { getCredTestIcon } = useCredentialTesting(() => null);
			const card = makeCard();
			expect(getCredTestIcon(card)).toBeNull();
		});

		test('returns check when credential test passed', () => {
			vi.spyOn(credentialsStore, 'isCredentialTestedOk').mockReturnValue(true);

			const { getCredTestIcon } = useCredentialTesting(() => 'cred-1');
			const card = makeCard();
			expect(getCredTestIcon(card)).toBe('check');
		});

		test('returns triangle-alert when credential test failed', () => {
			vi.spyOn(credentialsStore, 'isCredentialTestedOk').mockReturnValue(false);
			vi.spyOn(credentialsStore, 'isCredentialTestPending').mockReturnValue(false);
			credentialsStore.credentialTestResults.set('cred-1', 'error');

			const { getCredTestIcon } = useCredentialTesting(() => 'cred-1');
			const card = makeCard();
			expect(getCredTestIcon(card)).toBe('triangle-alert');
		});

		test('returns spinner when test is pending for testable type', () => {
			vi.spyOn(credentialsStore, 'isCredentialTestedOk').mockReturnValue(false);
			vi.spyOn(credentialsStore, 'isCredentialTestPending').mockReturnValue(false);
			const mockType = {
				name: 'slackApi',
				displayName: 'Slack API',
				properties: [],
				test: { request: { method: 'GET', url: '/test' } },
			};
			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getCredentialTypeByName', 'get').mockReturnValue(() => mockType);

			const { getCredTestIcon } = useCredentialTesting(() => 'cred-1');
			const card = makeCard();
			expect(getCredTestIcon(card)).toBe('spinner');
		});
	});

	describe('getEffectiveCredTestResult', () => {
		test('trusts store result over backend result', () => {
			vi.spyOn(credentialsStore, 'isCredentialTestedOk').mockReturnValue(true);

			const { getEffectiveCredTestResult } = useCredentialTesting(() => 'cred-1');
			const card = makeCard({
				credentialTestResult: { success: false, message: 'Backend says failed' },
			});
			const result = getEffectiveCredTestResult(card);
			expect(result).toEqual({ success: true });
		});

		test('falls back to backend result when selection matches original', () => {
			vi.spyOn(credentialsStore, 'isCredentialTestedOk').mockReturnValue(false);
			vi.spyOn(credentialsStore, 'isCredentialTestPending').mockReturnValue(false);

			const { getEffectiveCredTestResult } = useCredentialTesting(() => 'cred-1');
			const card = makeCard({
				credentialTestResult: { success: true },
			});
			const result = getEffectiveCredTestResult(card);
			expect(result).toEqual({ success: true });
		});

		test('returns undefined when no result is available', () => {
			vi.spyOn(credentialsStore, 'isCredentialTestedOk').mockReturnValue(false);
			vi.spyOn(credentialsStore, 'isCredentialTestPending').mockReturnValue(false);

			const { getEffectiveCredTestResult } = useCredentialTesting(() => 'new-cred');
			const card = makeCard();
			const result = getEffectiveCredTestResult(card);
			expect(result).toBeUndefined();
		});
	});
});
