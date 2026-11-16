import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useInstancePolicyStore } from './instance-policy.store';
import type { InstancePolicy, InstancePolicyContent } from '../type-availability-policies.api';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	saveInstancePolicy: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => ({
	fetchInstancePolicy: mocks.fetchInstancePolicy,
	saveInstancePolicy: mocks.saveInstancePolicy,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost', pushRef: 'test' } }),
}));

const DENY_SLACK: InstancePolicy<'node'>['rules'][number] = {
	id: 'deny-slack',
	selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
	action: 'deny',
};

const nodePolicy = (
	version: number,
	rules: Array<InstancePolicy<'node'>['rules'][number]> = [],
): InstancePolicy<'node'> => ({ scopeId: 'scope-node', rules, defaultAction: 'allow', version });

const credentialPolicy = (version: number): InstancePolicy<'credential'> => ({
	scopeId: 'scope-credential',
	rules: [],
	defaultAction: 'allow',
	version,
});

const conflict = () => new ResponseError('Policy scope has changed', { httpStatusCode: 409 });

const addDenySlack = (policy: InstancePolicy<'node'>): InstancePolicyContent<'node'> => ({
	rules: [...policy.rules, DENY_SLACK],
	defaultAction: policy.defaultAction,
});

describe('useInstancePolicyStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchInstancePolicy.mockImplementation(async (_context, kind: string) =>
			kind === 'node' ? nodePolicy(3) : credentialPolicy(7),
		);
		vi.spyOn(useTypeAvailabilityPoliciesStore(), 'reload').mockResolvedValue();
	});

	describe('load', () => {
		it('loads the policy of each kind', async () => {
			const store = useInstancePolicyStore();

			const errors = await store.load(['node', 'credential']);

			expect(errors).toEqual([]);
			expect(store.policies.node).toEqual(nodePolicy(3));
			expect(store.policies.credential).toEqual(credentialPolicy(7));
			expect(store.loadStates).toEqual({ node: 'loaded', credential: 'loaded' });
		});

		it('requests only the kinds it is given', async () => {
			const store = useInstancePolicyStore();

			await store.load(['node']);

			expect(mocks.fetchInstancePolicy).toHaveBeenCalledTimes(1);
			expect(mocks.fetchInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'node');
			expect(store.loadStates.credential).toBe('idle');
		});

		it('returns the error of a kind that fails and keeps the other kind', async () => {
			const error = new Error('Network');
			mocks.fetchInstancePolicy.mockImplementation(async (_context, kind: string) => {
				if (kind === 'credential') throw error;
				return nodePolicy(3);
			});
			const store = useInstancePolicyStore();

			const errors = await store.load(['node', 'credential']);

			expect(errors).toEqual([error]);
			expect(store.policies.node).toEqual(nodePolicy(3));
			expect(store.loadStates).toEqual({ node: 'loaded', credential: 'failed' });
		});

		it('keeps a newer policy when an older answer arrives late', async () => {
			const late = createDeferredPromise<InstancePolicy<'node'>>();
			mocks.fetchInstancePolicy.mockReturnValueOnce(late.promise);
			mocks.saveInstancePolicy.mockResolvedValue({ ...nodePolicy(4), warnings: [] });
			const store = useInstancePolicyStore();
			store.policies.node = nodePolicy(3);

			const load = store.load(['node']);
			await store.save('node', addDenySlack);
			late.resolve(nodePolicy(3));
			await load;

			expect(store.policies.node?.version).toBe(4);
		});
	});

	describe('save', () => {
		it('sends the change with the loaded version and keeps the saved policy', async () => {
			mocks.saveInstancePolicy.mockResolvedValue({
				...nodePolicy(4, [DENY_SLACK]),
				warnings: [{ kind: 'notLoaded', ruleId: 'deny-slack' }],
			});
			const store = useInstancePolicyStore();
			await store.load(['node']);

			const result = await store.save('node', addDenySlack);

			expect(mocks.saveInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'node', {
				rules: [DENY_SLACK],
				defaultAction: 'allow',
				version: 3,
			});
			expect(result).toEqual({
				status: 'saved',
				warnings: [{ kind: 'notLoaded', ruleId: 'deny-slack' }],
			});
			expect(store.policies.node?.version).toBe(4);
			expect(store.policies.node?.rules).toEqual([DENY_SLACK]);
		});

		it('reloads the builder restrictions after a save', async () => {
			mocks.saveInstancePolicy.mockResolvedValue({ ...nodePolicy(4), warnings: [] });
			const store = useInstancePolicyStore();
			await store.load(['node']);

			await store.save('node', addDenySlack);

			expect(useTypeAvailabilityPoliciesStore().reload).toHaveBeenCalled();
		});

		it('runs saves of one kind in order, each on the result of the one before', async () => {
			const first = createDeferredPromise<unknown>();
			mocks.saveInstancePolicy
				.mockReturnValueOnce(first.promise)
				.mockResolvedValueOnce({ ...nodePolicy(5), warnings: [] });
			const store = useInstancePolicyStore();
			await store.load(['node']);

			const firstSave = store.save('node', addDenySlack);
			const secondSave = store.save('node', (policy) => ({
				rules: policy.rules,
				defaultAction: 'deny',
			}));
			first.resolve({ ...nodePolicy(4, [DENY_SLACK]), warnings: [] });
			await Promise.all([firstSave, secondSave]);

			expect(mocks.saveInstancePolicy).toHaveBeenNthCalledWith(2, expect.anything(), 'node', {
				rules: [DENY_SLACK],
				defaultAction: 'deny',
				version: 4,
			});
		});

		it('does not wait for a save of the other kind', async () => {
			mocks.saveInstancePolicy.mockImplementation(async (_context, kind: string) =>
				kind === 'node' ? await new Promise(() => {}) : { ...credentialPolicy(8), warnings: [] },
			);
			const store = useInstancePolicyStore();
			await store.load(['node', 'credential']);

			void store.save('node', addDenySlack);
			const result = await store.save('credential', (policy) => policy);

			expect(result.status).toBe('saved');
		});

		it('loads the new policy and saves nothing when the policy changed after the load', async () => {
			mocks.saveInstancePolicy.mockRejectedValue(conflict());
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4, [DENY_SLACK]));

			const result = await store.save('node', addDenySlack);

			expect(result).toEqual({ status: 'changed' });
			expect(mocks.saveInstancePolicy).toHaveBeenCalledTimes(1);
			expect(store.policies.node).toEqual(nodePolicy(4, [DENY_SLACK]));
		});

		it('drops a save queued before the policy changed', async () => {
			mocks.saveInstancePolicy.mockRejectedValueOnce(conflict());
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4));

			const [first, second] = await Promise.all([
				store.save('node', addDenySlack),
				store.save('node', addDenySlack),
			]);

			expect(first).toEqual({ status: 'changed' });
			expect(second).toEqual({ status: 'dropped' });
			expect(mocks.saveInstancePolicy).toHaveBeenCalledTimes(1);
		});

		it('saves a change made after the conflict on the new version', async () => {
			mocks.saveInstancePolicy
				.mockRejectedValueOnce(conflict())
				.mockResolvedValueOnce({ ...nodePolicy(5), warnings: [] });
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4));
			await store.save('node', addDenySlack);

			const result = await store.save('node', addDenySlack);

			expect(result.status).toBe('saved');
			expect(mocks.saveInstancePolicy).toHaveBeenLastCalledWith(
				expect.anything(),
				'node',
				expect.objectContaining({ version: 4 }),
			);
		});

		it('reports a policy it cannot edit, without a reload loop, when the conflict is not a new version', async () => {
			const error = conflict();
			mocks.saveInstancePolicy.mockRejectedValue(error);
			const store = useInstancePolicyStore();
			await store.load(['node']);

			const result = await store.save('node', addDenySlack);

			expect(result).toEqual({ status: 'notEditable', error });
			expect(mocks.saveInstancePolicy).toHaveBeenCalledTimes(1);
			expect(mocks.fetchInstancePolicy).toHaveBeenCalledTimes(2);
			expect(store.policies.node).toEqual(nodePolicy(3));
		});

		it('fails with the save error when a conflict cannot load the new policy', async () => {
			const error = conflict();
			mocks.saveInstancePolicy.mockRejectedValue(error);
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstancePolicy.mockRejectedValue(new Error('Network'));

			const result = await store.save('node', addDenySlack);

			expect(result).toEqual({ status: 'failed', error });
		});

		it('fails on any other error and keeps the loaded policy', async () => {
			const error = new ResponseError('Invalid rule', { httpStatusCode: 400 });
			mocks.saveInstancePolicy.mockRejectedValue(error);
			const store = useInstancePolicyStore();
			await store.load(['node']);

			const result = await store.save('node', addDenySlack);

			expect(result).toEqual({ status: 'failed', error });
			expect(mocks.fetchInstancePolicy).toHaveBeenCalledTimes(1);
			expect(store.policies.node).toEqual(nodePolicy(3));
		});

		it('fails when the policy is not loaded', async () => {
			const store = useInstancePolicyStore();

			const result = await store.save('node', addDenySlack);

			expect(result.status).toBe('failed');
			expect(mocks.saveInstancePolicy).not.toHaveBeenCalled();
		});
	});
});
