import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useInstancePolicyStore } from './instance-policy.store';
import type { InstancePolicy, InstancePolicyContent } from '../type-availability-policies.api';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	fetchInstanceAccess: vi.fn(),
	saveInstancePolicy: vi.fn(),
	fetchNodeTypeUsage: vi.fn(),
	fetchCredentialTypeUsage: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => ({
	fetchInstancePolicy: mocks.fetchInstancePolicy,
	fetchInstanceAccess: mocks.fetchInstanceAccess,
	saveInstancePolicy: mocks.saveInstancePolicy,
	fetchNodeTypeUsage: mocks.fetchNodeTypeUsage,
	fetchCredentialTypeUsage: mocks.fetchCredentialTypeUsage,
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

const accessResponse = (version: number, slack: 'allow' | 'deny' = 'allow') => ({
	scopeId: 'scope-node',
	version,
	defaultAction: 'allow' as const,
	types: [{ name: 'n8n-nodes-base.slack', access: slack, matchedRuleId: null }],
});

/** The access after the Acme node type was installed, at the same policy version. */
const accessWithInstalledAcme = () => ({
	...accessResponse(3),
	types: [
		...accessResponse(3).types,
		{ name: 'n8n-nodes-acme.acme', access: 'deny' as const, matchedRuleId: null },
	],
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
		mocks.fetchInstanceAccess.mockImplementation(async () => accessResponse(3));
		vi.spyOn(useTypeAvailabilityPoliciesStore(), 'reload').mockResolvedValue();
	});

	describe('typeAccess', () => {
		it('reads the access of each type with the policy', async () => {
			const store = useInstancePolicyStore();

			await store.load(['node']);

			expect(mocks.fetchInstanceAccess).toHaveBeenCalledWith(expect.anything(), 'node');
			expect(store.typeAccess.node?.version).toBe(3);
			expect(store.typeAccess.node?.types.get('n8n-nodes-base.slack')?.access).toBe('allow');
			expect(store.typeAccess.credential).toBeNull();
		});

		it('reads the access of the credential policy for its own version', async () => {
			mocks.fetchInstanceAccess.mockImplementation(async (_context, kind: string) =>
				kind === 'node'
					? accessResponse(3)
					: {
							scopeId: 'scope-credential',
							version: 7,
							defaultAction: 'allow' as const,
							types: [{ name: 'slackApi', access: 'deny', matchedRuleId: null }],
						},
			);
			const store = useInstancePolicyStore();

			await store.load(['node', 'credential']);

			expect(store.typeAccess.credential?.version).toBe(7);
			expect(store.typeAccess.credential?.types.get('slackApi')?.access).toBe('deny');
			expect(store.typeAccess.node?.types.has('slackApi')).toBe(false);
		});

		it('reads the access again on each load, so it lists the types installed since', async () => {
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstanceAccess.mockResolvedValue(accessWithInstalledAcme());

			await store.load(['node']);

			expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2);
			expect(store.typeAccess.node?.types.get('n8n-nodes-acme.acme')?.access).toBe('deny');
		});

		it('reads the access again before a save resolves', async () => {
			mocks.saveInstancePolicy.mockResolvedValue({ ...nodePolicy(4, [DENY_SLACK]), warnings: [] });
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstanceAccess.mockResolvedValue(accessResponse(4, 'deny'));

			await store.save('node', addDenySlack);

			expect(store.typeAccess.node?.version).toBe(4);
			expect(store.typeAccess.node?.types.get('n8n-nodes-base.slack')?.access).toBe('deny');
		});

		it('keeps a newer access when an older answer arrives late', async () => {
			const olderAccess = createDeferredPromise<ReturnType<typeof accessResponse>>();
			mocks.fetchInstanceAccess.mockReturnValueOnce(olderAccess.promise);
			const store = useInstancePolicyStore();
			const olderLoad = store.load(['node']);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4));
			mocks.fetchInstanceAccess.mockResolvedValue(accessResponse(4, 'deny'));
			await vi.waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(1));

			await store.load(['node']);
			olderAccess.resolve(accessResponse(3));
			await olderLoad;

			expect(store.typeAccess.node?.version).toBe(4);
			expect(store.typeAccess.node?.types.get('n8n-nodes-base.slack')?.access).toBe('deny');
		});

		it('keeps the newer access when an older answer of the same policy version arrives late', async () => {
			const olderAccess = createDeferredPromise<ReturnType<typeof accessResponse>>();
			mocks.fetchInstanceAccess.mockReturnValueOnce(olderAccess.promise);
			const store = useInstancePolicyStore();
			const olderLoad = store.load(['node']);
			await vi.waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(1));
			mocks.fetchInstanceAccess.mockResolvedValue(accessWithInstalledAcme());

			await store.load(['node']);
			olderAccess.resolve(accessResponse(3));
			await olderLoad;

			expect(store.typeAccess.node?.types.get('n8n-nodes-acme.acme')?.access).toBe('deny');
		});

		it('reports no read error for a load when a save read the current access after it', async () => {
			const store = useInstancePolicyStore();
			await store.load(['node']);
			const loadRead = createDeferredPromise<ReturnType<typeof accessResponse>>();
			mocks.fetchInstanceAccess.mockReturnValueOnce(loadRead.promise);
			const load = store.load(['node']);
			await vi.waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2));
			mocks.saveInstancePolicy.mockResolvedValue({ ...nodePolicy(4, [DENY_SLACK]), warnings: [] });
			mocks.fetchInstanceAccess.mockResolvedValue(accessResponse(4, 'deny'));

			await store.save('node', addDenySlack);
			loadRead.reject(new Error('offline'));

			expect(await load).toEqual({ errors: [], accessErrors: [] });
			expect(store.typeAccess.node?.version).toBe(4);
		});

		it('keeps the older access, and its older version, when the read after a save fails', async () => {
			mocks.saveInstancePolicy.mockResolvedValue({ ...nodePolicy(4, [DENY_SLACK]), warnings: [] });
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));

			const result = await store.save('node', addDenySlack);

			expect(result).toEqual({ status: 'saved', warnings: [], accessError: new Error('offline') });
			expect(store.typeAccess.node?.version).toBe(3);
			expect(store.policies.node?.version).toBe(4);
		});

		it('reads the access of the new policy when a save finds that the policy changed', async () => {
			mocks.saveInstancePolicy.mockRejectedValue(conflict());
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4, [DENY_SLACK]));
			mocks.fetchInstanceAccess.mockResolvedValue(accessResponse(4, 'deny'));

			await store.save('node', addDenySlack);

			expect(store.typeAccess.node?.version).toBe(4);
			expect(store.typeAccess.node?.types.get('n8n-nodes-base.slack')?.access).toBe('deny');
		});

		it('reports the read error, and keeps the older access, when the policy changed and its access cannot be read', async () => {
			mocks.saveInstancePolicy.mockRejectedValue(conflict());
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4, [DENY_SLACK]));
			mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));

			const result = await store.save('node', addDenySlack);

			expect(result).toEqual({ status: 'changed', accessError: new Error('offline') });
			expect(store.typeAccess.node?.version).toBe(3);
			expect(store.policies.node?.version).toBe(4);
		});

		it('sends the next save of a kind before the access read of the previous save ends', async () => {
			const store = useInstancePolicyStore();
			await store.load(['node']);
			const firstRead = createDeferredPromise<ReturnType<typeof accessResponse>>();
			mocks.fetchInstanceAccess.mockReturnValueOnce(firstRead.promise);
			mocks.fetchInstanceAccess.mockResolvedValue(accessResponse(5, 'deny'));
			mocks.saveInstancePolicy
				.mockResolvedValueOnce({ ...nodePolicy(4, [DENY_SLACK]), warnings: [] })
				.mockResolvedValueOnce({ ...nodePolicy(5, [DENY_SLACK]), warnings: [] });

			const first = store.save('node', addDenySlack);
			const second = store.save('node', (policy) => policy);
			await vi.waitFor(() => expect(mocks.saveInstancePolicy).toHaveBeenCalledTimes(2));
			await second;
			firstRead.resolve(accessResponse(4));
			await first;

			expect(store.policies.node?.version).toBe(5);
			expect(store.typeAccess.node?.version).toBe(5);
			expect(store.typeAccess.node?.types.get('n8n-nodes-base.slack')?.access).toBe('deny');
		});

		it('reports no read error for a save when a later save already read the current access', async () => {
			const store = useInstancePolicyStore();
			await store.load(['node']);
			const firstRead = createDeferredPromise<ReturnType<typeof accessResponse>>();
			mocks.fetchInstanceAccess.mockReturnValueOnce(firstRead.promise);
			mocks.fetchInstanceAccess.mockResolvedValue(accessResponse(5, 'deny'));
			mocks.saveInstancePolicy
				.mockResolvedValueOnce({ ...nodePolicy(4, [DENY_SLACK]), warnings: [] })
				.mockResolvedValueOnce({ ...nodePolicy(5, [DENY_SLACK]), warnings: [] });

			const first = store.save('node', addDenySlack);
			await store.save('node', (policy) => policy);
			firstRead.reject(new Error('offline'));

			expect(await first).toEqual({ status: 'saved', warnings: [] });
			expect(store.typeAccess.node?.version).toBe(5);
		});

		it('keeps no access when an older read ends after a newer read failed', async () => {
			const olderRead = createDeferredPromise<ReturnType<typeof accessResponse>>();
			mocks.fetchInstanceAccess.mockReturnValueOnce(olderRead.promise);
			const store = useInstancePolicyStore();
			const olderLoad = store.load(['node']);
			await vi.waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(1));
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4));
			mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));

			await store.load(['node']);
			olderRead.resolve(accessResponse(3));
			await olderLoad;

			expect(store.typeAccess.node).toBeNull();
		});

		it('reads the access again on request after a failed read', async () => {
			mocks.fetchInstanceAccess.mockRejectedValueOnce(new Error('offline'));
			const store = useInstancePolicyStore();
			await store.load(['node']);

			const errors = await store.loadAccess(['node']);

			expect(errors).toEqual([]);
			expect(store.typeAccess.node?.version).toBe(3);
		});

		it('reads the access again on request when a read of the current version failed', async () => {
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstanceAccess.mockRejectedValueOnce(new Error('offline'));
			await store.load(['node']);
			mocks.fetchInstanceAccess.mockResolvedValue(accessWithInstalledAcme());

			const errors = await store.loadAccess(['node']);

			expect(errors).toEqual([]);
			expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(3);
			expect(store.typeAccess.node?.types.get('n8n-nodes-acme.acme')?.access).toBe('deny');
		});

		it('does not read the access again when it matches the policy', async () => {
			const store = useInstancePolicyStore();
			await store.load(['node']);

			await store.loadAccess(['node']);

			expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(1);
		});

		it('loads the policy when the access read fails', async () => {
			mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));
			const store = useInstancePolicyStore();

			const result = await store.load(['node']);

			expect(result).toEqual({ errors: [], accessErrors: [new Error('offline')] });
			expect(store.policies.node).toEqual(nodePolicy(3));
			expect(store.loadStates.node).toBe('loaded');
			expect(store.typeAccess.node).toBeNull();
		});
	});

	describe('load', () => {
		it('loads the policy of each kind', async () => {
			const store = useInstancePolicyStore();

			const result = await store.load(['node', 'credential']);

			expect(result).toEqual({ errors: [], accessErrors: [] });
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

			const result = await store.load(['node', 'credential']);

			expect(result).toEqual({ errors: [error], accessErrors: [] });
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

		it('keeps the newer load state and error when an older load fails late', async () => {
			const older = createDeferredPromise<InstancePolicy<'node'>>();
			mocks.fetchInstancePolicy.mockReturnValueOnce(older.promise);
			const store = useInstancePolicyStore();

			const olderLoad = store.load(['node']);
			await store.load(['node']);
			older.reject(new Error('Network'));

			expect(await olderLoad).toEqual({ errors: [], accessErrors: [] });
			expect(store.loadStates.node).toBe('loaded');
			expect(store.policies.node).toEqual(nodePolicy(3));
		});

		it('drops the access read error of an older load when a newer load read the access', async () => {
			const olderRead = createDeferredPromise<ReturnType<typeof accessResponse>>();
			mocks.fetchInstanceAccess.mockReturnValueOnce(olderRead.promise);
			const store = useInstancePolicyStore();
			const olderLoad = store.load(['node']);
			await vi.waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(1));

			const newerLoad = await store.load(['node']);
			olderRead.reject(new Error('offline'));

			expect(await olderLoad).toEqual({ errors: [], accessErrors: [] });
			expect(newerLoad).toEqual({ errors: [], accessErrors: [] });
			expect(store.typeAccess.node?.version).toBe(3);
		});

		it('does not reload the builder restrictions on the first load', async () => {
			const store = useInstancePolicyStore();

			await store.load(['node']);

			expect(useTypeAvailabilityPoliciesStore().reload).not.toHaveBeenCalled();
		});

		it('reloads the builder restrictions when a load finds a newer policy', async () => {
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4));

			await store.load(['node']);

			expect(useTypeAvailabilityPoliciesStore().reload).toHaveBeenCalledTimes(1);
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
			expect(useTypeAvailabilityPoliciesStore().reload).toHaveBeenCalledTimes(1);
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

			expect(result).toEqual({ status: 'notEditable', sent: true });
			expect(store.notEditable.node).toBe(true);
			expect(mocks.saveInstancePolicy).toHaveBeenCalledTimes(1);
			expect(mocks.fetchInstancePolicy).toHaveBeenCalledTimes(2);
			expect(store.policies.node).toEqual(nodePolicy(3));
		});

		it('does not send the saves after a policy it cannot edit, queued or new', async () => {
			mocks.saveInstancePolicy.mockRejectedValue(conflict());
			const store = useInstancePolicyStore();
			await store.load(['node']);

			const [first, queued] = await Promise.all([
				store.save('node', addDenySlack),
				store.save('node', addDenySlack),
			]);
			const later = await store.save('node', addDenySlack);

			expect(first).toEqual({ status: 'notEditable', sent: true });
			expect(queued).toEqual({ status: 'notEditable', sent: false });
			expect(later).toEqual({ status: 'notEditable', sent: false });
			expect(mocks.saveInstancePolicy).toHaveBeenCalledTimes(1);
			expect(store.notEditable.credential).toBe(false);
		});

		it('sends saves again after a load finds a newer version', async () => {
			mocks.saveInstancePolicy.mockRejectedValueOnce(conflict());
			const store = useInstancePolicyStore();
			await store.load(['node']);
			await store.save('node', addDenySlack);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4));
			mocks.saveInstancePolicy.mockResolvedValueOnce({ ...nodePolicy(5), warnings: [] });

			await store.load(['node']);
			const result = await store.save('node', addDenySlack);

			expect(store.notEditable.node).toBe(false);
			expect(result.status).toBe('saved');
		});

		it('runs the next save of a kind after a save rejects', async () => {
			mocks.saveInstancePolicy
				.mockRejectedValueOnce(conflict())
				.mockResolvedValueOnce({ ...nodePolicy(5), warnings: [] });
			const store = useInstancePolicyStore();
			await store.load(['node']);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(4));
			vi.mocked(useTypeAvailabilityPoliciesStore().reload).mockImplementationOnce(() => {
				throw new Error('Unexpected');
			});

			await expect(store.save('node', addDenySlack)).rejects.toThrow('Unexpected');
			const result = await store.save('node', addDenySlack);

			expect(result.status).toBe('saved');
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

	// `useTypeUsage.test.ts` covers the counts of one kind.
	describe('loadUsage', () => {
		const SLACK = 'n8n-nodes-base.slack';
		const SLACK_USAGE = { uses: 3, workflows: 2, activeWorkflows: 1, projects: 1 };

		beforeEach(() => {
			mocks.fetchNodeTypeUsage.mockResolvedValue({ [SLACK]: SLACK_USAGE });
			mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		});

		it('keeps the counts of each kind apart', async () => {
			const store = useInstancePolicyStore();

			await store.loadUsage('node');

			expect(store.usageOf('node', SLACK)).toEqual(SLACK_USAGE);
			expect(store.usageOf('credential', 'slackApi')).toBeNull();
			expect(mocks.fetchCredentialTypeUsage).not.toHaveBeenCalled();
		});

		it('reads only the kinds that have no counts yet', async () => {
			const store = useInstancePolicyStore();
			await store.loadUsage('node');

			await store.loadMissingUsage(['node', 'credential']);

			expect(mocks.fetchNodeTypeUsage).toHaveBeenCalledTimes(1);
			expect(mocks.fetchCredentialTypeUsage).toHaveBeenCalledTimes(1);
		});

		it('reads the counts of a kind again after a failed read', async () => {
			mocks.fetchNodeTypeUsage.mockRejectedValueOnce(new Error('offline'));
			const store = useInstancePolicyStore();
			await store.loadUsage('node');
			expect(store.usageOf('node', SLACK)).toBeNull();

			await store.loadMissingUsage(['node']);

			expect(store.usageOf('node', SLACK)).toEqual(SLACK_USAGE);
		});
	});
});
