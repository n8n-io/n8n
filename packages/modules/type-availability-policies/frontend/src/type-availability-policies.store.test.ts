import type { AvailableCredentialTypesResponse, AvailableTypesResponse } from '@n8n/api-types';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useTypeAvailabilityPoliciesStore } from './type-availability-policies.store';

const mocks = vi.hoisted(() => ({
	fetchAvailableTypes: vi.fn(),
	fetchAvailableCredentialTypes: vi.fn(),
	isModuleActive: vi.fn(),
}));

vi.mock('./type-availability-policies.api', () => ({
	fetchAvailableTypes: mocks.fetchAvailableTypes,
	fetchAvailableCredentialTypes: mocks.fetchAvailableCredentialTypes,
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isModuleActive: mocks.isModuleActive }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: 'http://localhost', pushRef: 'test' },
	}),
}));

const ALLOWED = 'n8n-nodes-base.slack';
const RESTRICTED = 'n8n-nodes-base.executeCommand';
const UNKNOWN = 'n8n-nodes-base.doesNotExist';

const PROJECT_A_RESPONSE: AvailableTypesResponse = [
	{ name: ALLOWED, available: true },
	{ name: RESTRICTED, available: false, scope: 'project', matchedRuleId: 'rule-1' },
];

const PROJECT_B_RESPONSE: AvailableTypesResponse = [
	{ name: ALLOWED, available: false, scope: 'instance' },
	{ name: RESTRICTED, available: true },
];

const ALLOWED_CREDENTIAL = 'sysdigApi';
const RESTRICTED_CREDENTIAL = 'virusTotalApi';

const PROJECT_A_CREDENTIALS: AvailableCredentialTypesResponse = [
	{ name: ALLOWED_CREDENTIAL, available: true },
	{ name: RESTRICTED_CREDENTIAL, available: false, scope: 'instance', matchedRuleId: 'rule-9' },
];

describe('useTypeAvailabilityPoliciesStore', () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mocks.fetchAvailableTypes.mockReset();
		mocks.fetchAvailableCredentialTypes.mockReset().mockResolvedValue([]);
		mocks.isModuleActive.mockReset().mockReturnValue(true);
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	describe('when the module is not active', () => {
		beforeEach(() => {
			mocks.isModuleActive.mockReturnValue(false);
		});

		it('reports every type as available and makes no request', async () => {
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');

			expect(store.isEnabled).toBe(false);
			expect(mocks.fetchAvailableTypes).not.toHaveBeenCalled();
			expect(store.getNodeTypeAvailability(RESTRICTED)).toEqual({
				name: RESTRICTED,
				available: true,
			});
		});
	});

	describe('when the instance reports no active modules', () => {
		beforeEach(() => {
			mocks.isModuleActive.mockReturnValue(undefined);
		});

		it('reports every type as available and makes no request', async () => {
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');

			expect(store.isEnabled).toBe(false);
			expect(mocks.fetchAvailableTypes).not.toHaveBeenCalled();
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});
	});

	describe('when the module is active', () => {
		it('returns the restricted entry with its scope and rule', async () => {
			mocks.fetchAvailableTypes.mockResolvedValue(PROJECT_A_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');

			expect(mocks.fetchAvailableTypes).toHaveBeenCalledWith(
				expect.objectContaining({ baseUrl: 'http://localhost' }),
				'project-a',
			);
			expect(store.loadedProjectId).toBe('project-a');
			expect(store.getNodeTypeAvailability(RESTRICTED)).toEqual({
				name: RESTRICTED,
				available: false,
				scope: 'project',
				matchedRuleId: 'rule-1',
			});
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(false);
		});

		it('reports allowed and unknown types as available', async () => {
			mocks.fetchAvailableTypes.mockResolvedValue(PROJECT_A_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');

			expect(store.getNodeTypeAvailability(ALLOWED)).toEqual({ name: ALLOWED, available: true });
			expect(store.getNodeTypeAvailability(UNKNOWN)).toEqual({ name: UNKNOWN, available: true });
		});

		it('does not refetch the project that is already loaded', async () => {
			mocks.fetchAvailableTypes.mockResolvedValue(PROJECT_A_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			await store.fetchForProject('project-a');

			expect(mocks.fetchAvailableTypes).toHaveBeenCalledTimes(1);
		});

		it('reflects the new project after a switch', async () => {
			mocks.fetchAvailableTypes
				.mockResolvedValueOnce(PROJECT_A_RESPONSE)
				.mockResolvedValueOnce(PROJECT_B_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			await store.fetchForProject('project-b');

			expect(store.loadedProjectId).toBe('project-b');
			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(false);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});

		it('reports every type as available while a project switch is in flight', async () => {
			let resolveB: (value: AvailableTypesResponse) => void = () => {};
			mocks.fetchAvailableTypes.mockResolvedValueOnce(PROJECT_A_RESPONSE).mockImplementationOnce(
				async () =>
					await new Promise<AvailableTypesResponse>((resolve) => {
						resolveB = resolve;
					}),
			);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			const pendingB = store.fetchForProject('project-b');

			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
			expect(store.getNodeTypeAvailability(RESTRICTED)).toEqual({
				name: RESTRICTED,
				available: true,
			});

			resolveB(PROJECT_B_RESPONSE);
			await pendingB;

			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(false);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});

		it('discards a response for a project that is no longer requested', async () => {
			let resolveA: (value: AvailableTypesResponse) => void = () => {};
			mocks.fetchAvailableTypes
				.mockImplementationOnce(
					async () =>
						await new Promise<AvailableTypesResponse>((resolve) => {
							resolveA = resolve;
						}),
				)
				.mockResolvedValueOnce(PROJECT_B_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			const pendingA = store.fetchForProject('project-a');
			await store.fetchForProject('project-b');
			resolveA(PROJECT_A_RESPONSE);
			await pendingA;

			expect(store.loadedProjectId).toBe('project-b');
			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(false);
			expect(store.isLoading).toBe(false);
		});

		it('discards an in-flight response when the user returns to the loaded project', async () => {
			let resolveB: (value: AvailableTypesResponse) => void = () => {};
			mocks.fetchAvailableTypes.mockResolvedValueOnce(PROJECT_A_RESPONSE).mockImplementationOnce(
				async () =>
					await new Promise<AvailableTypesResponse>((resolve) => {
						resolveB = resolve;
					}),
			);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			const pendingB = store.fetchForProject('project-b');
			await store.fetchForProject('project-a');
			resolveB(PROJECT_B_RESPONSE);
			await pendingB;

			expect(store.loadedProjectId).toBe('project-a');
			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(true);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(false);
			expect(store.isLoading).toBe(false);
		});

		it('degrades to available and logs when the request fails', async () => {
			mocks.fetchAvailableTypes.mockRejectedValue(new Error('endpoint failure'));
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');

			expect(errorSpy).toHaveBeenCalledTimes(1);
			expect(store.loadedProjectId).toBeNull();
			expect(store.isLoading).toBe(false);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});

		it('retries after a failed request', async () => {
			mocks.fetchAvailableTypes
				.mockRejectedValueOnce(new Error('endpoint failure'))
				.mockResolvedValueOnce(PROJECT_A_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			await store.fetchForProject('project-a');

			expect(mocks.fetchAvailableTypes).toHaveBeenCalledTimes(2);
			expect(store.loadedProjectId).toBe('project-a');
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(false);
		});

		it('clears all state on reset', async () => {
			mocks.fetchAvailableTypes.mockResolvedValue(PROJECT_A_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			store.reset();

			expect(store.loadedProjectId).toBeNull();
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});
	});

	describe('credential types', () => {
		beforeEach(() => {
			mocks.fetchAvailableTypes.mockResolvedValue(PROJECT_A_RESPONSE);
			mocks.fetchAvailableCredentialTypes.mockResolvedValue(PROJECT_A_CREDENTIALS);
		});

		it('loads credential type availability together with the node types of the project', async () => {
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');

			expect(mocks.fetchAvailableCredentialTypes).toHaveBeenCalledWith(
				expect.objectContaining({ baseUrl: 'http://localhost' }),
				'project-a',
			);
			expect(store.getCredentialTypeAvailability(RESTRICTED_CREDENTIAL)).toEqual({
				name: RESTRICTED_CREDENTIAL,
				available: false,
				scope: 'instance',
				matchedRuleId: 'rule-9',
			});
			expect(store.isCredentialTypeAvailable(RESTRICTED_CREDENTIAL)).toBe(false);
			expect(store.isCredentialTypeAvailable(ALLOWED_CREDENTIAL)).toBe(true);
			expect(store.isCredentialTypeAvailable('doesNotExistApi')).toBe(true);
		});

		it('reports every credential type as available while a project switch is in flight', async () => {
			let resolveB: (value: AvailableCredentialTypesResponse) => void = () => {};
			mocks.fetchAvailableCredentialTypes
				.mockResolvedValueOnce(PROJECT_A_CREDENTIALS)
				.mockImplementationOnce(
					async () =>
						await new Promise<AvailableCredentialTypesResponse>((resolve) => {
							resolveB = resolve;
						}),
				);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			const pendingB = store.fetchForProject('project-b');

			expect(store.isCredentialTypeAvailable(RESTRICTED_CREDENTIAL)).toBe(true);

			resolveB([]);
			await pendingB;

			expect(store.loadedProjectId).toBe('project-b');
			expect(store.isCredentialTypeAvailable(RESTRICTED_CREDENTIAL)).toBe(true);
		});

		it('degrades both kinds to available when only the credential request fails', async () => {
			mocks.fetchAvailableCredentialTypes.mockRejectedValue(new Error('endpoint failure'));
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');

			expect(errorSpy).toHaveBeenCalledTimes(1);
			expect(store.loadedProjectId).toBeNull();
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
			expect(store.isCredentialTypeAvailable(RESTRICTED_CREDENTIAL)).toBe(true);
		});

		it('clears credential types on reset', async () => {
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			store.reset();

			expect(store.isCredentialTypeAvailable(RESTRICTED_CREDENTIAL)).toBe(true);
		});
	});
});
