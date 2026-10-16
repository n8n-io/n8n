import type { AvailableCredentialTypesResponse, AvailableTypesResponse } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
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
			expect(store.activeProjectId).toBe('project-a');
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

		it('reloads the requested project', async () => {
			mocks.fetchAvailableTypes
				.mockResolvedValueOnce(PROJECT_A_RESPONSE)
				.mockResolvedValueOnce(PROJECT_B_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			await store.reload();

			expect(mocks.fetchAvailableTypes).toHaveBeenCalledTimes(2);
			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(false);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});

		it('keeps the loaded answer while a reload is in flight', async () => {
			const reload = createDeferredPromise<AvailableTypesResponse>();
			mocks.fetchAvailableTypes
				.mockResolvedValueOnce(PROJECT_A_RESPONSE)
				.mockReturnValueOnce(reload.promise);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			const pending = store.reload();

			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(false);

			reload.resolve(PROJECT_B_RESPONSE);
			await pending;

			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});

		it('ignores an older response for the same project after a reload', async () => {
			const first = createDeferredPromise<AvailableTypesResponse>();
			mocks.fetchAvailableTypes
				.mockReturnValueOnce(first.promise)
				.mockResolvedValueOnce(PROJECT_B_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			const pending = store.fetchForProject('project-a');
			await store.reload();
			first.resolve(PROJECT_A_RESPONSE);
			await pending;

			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(false);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});

		it('does not reload before a project was requested', async () => {
			const store = useTypeAvailabilityPoliciesStore();

			await store.reload();

			expect(mocks.fetchAvailableTypes).not.toHaveBeenCalled();
		});

		it('reflects the new project after a switch', async () => {
			mocks.fetchAvailableTypes
				.mockResolvedValueOnce(PROJECT_A_RESPONSE)
				.mockResolvedValueOnce(PROJECT_B_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			await store.fetchForProject('project-b');

			expect(store.activeProjectId).toBe('project-b');
			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(false);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});

		it('answers for an explicit project, whichever project is active', async () => {
			mocks.fetchAvailableTypes
				.mockResolvedValueOnce(PROJECT_A_RESPONSE)
				.mockResolvedValueOnce(PROJECT_B_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			await store.fetchForProject('project-b');

			expect(store.isNodeTypeAvailable(RESTRICTED, 'project-a')).toBe(false);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
			expect(store.isNodeTypeAvailable(RESTRICTED, 'project-c')).toBe(true);
		});

		it('shares one request between callers of the same project', async () => {
			mocks.fetchAvailableTypes.mockResolvedValue(PROJECT_A_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await Promise.all([store.fetchForProject('project-a'), store.fetchForProject('project-a')]);

			expect(mocks.fetchAvailableTypes).toHaveBeenCalledTimes(1);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(false);
		});

		it('reports every type as available while a project switch is in flight', async () => {
			const deferredB = createDeferredPromise<AvailableTypesResponse>();
			mocks.fetchAvailableTypes
				.mockResolvedValueOnce(PROJECT_A_RESPONSE)
				.mockReturnValueOnce(deferredB.promise);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			const pendingB = store.fetchForProject('project-b');

			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
			expect(store.getNodeTypeAvailability(RESTRICTED)).toEqual({
				name: RESTRICTED,
				available: true,
			});

			deferredB.resolve(PROJECT_B_RESPONSE);
			await pendingB;

			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(false);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});

		it('keeps answering for the active project when an earlier project responds late', async () => {
			const deferredA = createDeferredPromise<AvailableTypesResponse>();
			mocks.fetchAvailableTypes
				.mockReturnValueOnce(deferredA.promise)
				.mockResolvedValueOnce(PROJECT_B_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			const pendingA = store.fetchForProject('project-a');
			await store.fetchForProject('project-b');
			deferredA.resolve(PROJECT_A_RESPONSE);
			await pendingA;

			expect(store.activeProjectId).toBe('project-b');
			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(false);
			expect(store.isNodeTypeAvailable(RESTRICTED, 'project-a')).toBe(false);
		});

		it('keeps the loaded answer when the user returns to a project, then refreshes it', async () => {
			const deferredB = createDeferredPromise<AvailableTypesResponse>();
			const refreshA = createDeferredPromise<AvailableTypesResponse>();
			mocks.fetchAvailableTypes
				.mockResolvedValueOnce(PROJECT_A_RESPONSE)
				.mockReturnValueOnce(deferredB.promise)
				.mockReturnValueOnce(refreshA.promise);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			const pendingB = store.fetchForProject('project-b');
			const pendingA = store.fetchForProject('project-a');
			deferredB.resolve(PROJECT_B_RESPONSE);
			await pendingB;

			expect(store.activeProjectId).toBe('project-a');
			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(true);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(false);

			refreshA.resolve(PROJECT_B_RESPONSE);
			await pendingA;

			expect(store.isNodeTypeAvailable(ALLOWED)).toBe(false);
		});

		it('drops the other projects on reload', async () => {
			mocks.fetchAvailableTypes.mockResolvedValue(PROJECT_A_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			await store.fetchForProject('project-b');
			await store.reload();

			expect(mocks.fetchAvailableTypes).toHaveBeenLastCalledWith(expect.anything(), 'project-b');
			expect(store.isNodeTypeAvailable(RESTRICTED, 'project-a')).toBe(true);
			expect(store.isNodeTypeAvailable(RESTRICTED, 'project-b')).toBe(false);
		});

		it('degrades to available and logs when the request fails', async () => {
			mocks.fetchAvailableTypes.mockRejectedValue(new Error('endpoint failure'));
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');

			expect(errorSpy).toHaveBeenCalledTimes(1);
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
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(false);
		});

		it('clears all state on reset', async () => {
			mocks.fetchAvailableTypes.mockResolvedValue(PROJECT_A_RESPONSE);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			store.reset();

			expect(store.activeProjectId).toBeNull();
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
		});

		describe('pendingLoad', () => {
			it('returns the in-flight promise for the active project while its load is pending, then undefined once it settles', async () => {
				const deferred = createDeferredPromise<AvailableTypesResponse>();
				mocks.fetchAvailableTypes.mockReturnValueOnce(deferred.promise);
				const store = useTypeAvailabilityPoliciesStore();

				const pending = store.fetchForProject('project-a');

				expect(store.pendingLoad()).toBeInstanceOf(Promise);

				deferred.resolve(PROJECT_A_RESPONSE);
				await pending;

				expect(store.pendingLoad()).toBeUndefined();
			});

			it('returns undefined for a project that was never requested', async () => {
				const store = useTypeAvailabilityPoliciesStore();

				expect(store.pendingLoad('project-a')).toBeUndefined();
			});

			it('returns the answer for an explicit project id, independent of which project is active', async () => {
				const deferredA = createDeferredPromise<AvailableTypesResponse>();
				const deferredB = createDeferredPromise<AvailableTypesResponse>();
				mocks.fetchAvailableTypes
					.mockReturnValueOnce(deferredA.promise)
					.mockReturnValueOnce(deferredB.promise);
				const store = useTypeAvailabilityPoliciesStore();

				const pendingA = store.fetchForProject('project-a');
				const pendingB = store.fetchForProject('project-b');

				expect(store.activeProjectId).toBe('project-b');
				expect(store.pendingLoad('project-a')).toBeInstanceOf(Promise);
				expect(store.pendingLoad('project-b')).toBeInstanceOf(Promise);

				deferredA.resolve(PROJECT_A_RESPONSE);
				deferredB.resolve(PROJECT_B_RESPONSE);
				await Promise.all([pendingA, pendingB]);

				expect(store.pendingLoad('project-a')).toBeUndefined();
				expect(store.pendingLoad('project-b')).toBeUndefined();
			});
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
			expect(store.getCredentialTypeAvailability(RESTRICTED_CREDENTIAL).available).toBe(false);
			expect(store.getCredentialTypeAvailability(ALLOWED_CREDENTIAL).available).toBe(true);
			expect(store.getCredentialTypeAvailability('doesNotExistApi').available).toBe(true);
		});

		it('reports every credential type as available while a project switch is in flight', async () => {
			const deferredB = createDeferredPromise<AvailableCredentialTypesResponse>();
			mocks.fetchAvailableCredentialTypes
				.mockResolvedValueOnce(PROJECT_A_CREDENTIALS)
				.mockReturnValueOnce(deferredB.promise);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			const pendingB = store.fetchForProject('project-b');

			expect(store.getCredentialTypeAvailability(RESTRICTED_CREDENTIAL).available).toBe(true);

			deferredB.resolve([]);
			await pendingB;

			expect(store.activeProjectId).toBe('project-b');
			expect(store.getCredentialTypeAvailability(RESTRICTED_CREDENTIAL).available).toBe(true);
		});

		it('reloads both kinds for the requested project', async () => {
			mocks.fetchAvailableCredentialTypes
				.mockResolvedValueOnce(PROJECT_A_CREDENTIALS)
				.mockResolvedValueOnce([]);
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			expect(store.getCredentialTypeAvailability(RESTRICTED_CREDENTIAL).available).toBe(false);

			await store.reload();

			expect(mocks.fetchAvailableCredentialTypes).toHaveBeenCalledTimes(2);
			expect(store.getCredentialTypeAvailability(RESTRICTED_CREDENTIAL).available).toBe(true);
		});

		it('degrades both kinds to available when only the credential request fails', async () => {
			mocks.fetchAvailableCredentialTypes.mockRejectedValue(new Error('endpoint failure'));
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');

			expect(errorSpy).toHaveBeenCalledTimes(1);
			expect(store.isNodeTypeAvailable(RESTRICTED)).toBe(true);
			expect(store.getCredentialTypeAvailability(RESTRICTED_CREDENTIAL).available).toBe(true);
		});

		it('clears credential types on reset', async () => {
			const store = useTypeAvailabilityPoliciesStore();

			await store.fetchForProject('project-a');
			store.reset();

			expect(store.getCredentialTypeAvailability(RESTRICTED_CREDENTIAL).available).toBe(true);
		});
	});
});
