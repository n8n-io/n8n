import type { InstanceTypeAccessResponse } from '@n8n/api-types';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { waitFor } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useInstancePolicyStore } from './instance-policy.store';
import { useInstanceTypeAccess } from './useInstanceTypeAccess';
import type { InstancePolicy } from '../type-availability-policies.api';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	saveInstancePolicy: vi.fn(),
	fetchInstanceAccess: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => mocks);

const nodePolicy = (version: number): InstancePolicy<'node'> => ({
	scopeId: 'scope-1',
	rules: [],
	defaultAction: 'allow',
	version,
});

const nodeAccess = (version: number): InstanceTypeAccessResponse => ({
	scopeId: 'scope-1',
	version,
	defaultAction: 'allow',
	types: [{ name: 'n8n-nodes-base.slack', access: 'allow', matchedRuleId: null }],
});

const setup = async () => {
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(['nodeTypePolicy:manage']);
	vi.spyOn(useTypeAvailabilityPoliciesStore(), 'reload').mockResolvedValue();
	await useInstancePolicyStore().load(['node']);
};

describe('useInstanceTypeAccess', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(1));
		mocks.fetchInstanceAccess.mockResolvedValue(nodeAccess(1));
	});

	it('shows the access that the store read and saves a change through it', async () => {
		await setup();
		mocks.saveInstancePolicy.mockResolvedValue({ ...nodePolicy(2), warnings: [] });

		const { types, changeAccess } = useInstanceTypeAccess('node');

		expect(types.value).toEqual([
			{ name: 'n8n-nodes-base.slack', access: 'allow', matchedRuleId: null, editable: true },
		]);
		expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(1);

		await changeAccess('n8n-nodes-base.slack', 'deny');

		expect(mocks.saveInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'node', {
			defaultAction: 'allow',
			version: 1,
			rules: [
				{
					id: expect.any(String),
					action: 'deny',
					selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
				},
			],
		});
		// The store reads the access of the saved version once, and the composable does not read it.
		expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2);
	});

	it('is loading while the store reads the access after a save', async () => {
		await setup();
		mocks.saveInstancePolicy.mockResolvedValue({ ...nodePolicy(2), warnings: [] });
		const read = createDeferredPromise<InstanceTypeAccessResponse>();
		mocks.fetchInstanceAccess.mockReturnValue(read.promise);
		const { loading, changeAccess } = useInstanceTypeAccess('node');
		expect(loading.value).toBe(false);

		const change = changeAccess('n8n-nodes-base.slack', 'deny');
		await waitFor(() => expect(loading.value).toBe(true));

		read.resolve(nodeAccess(2));
		await change;
		expect(loading.value).toBe(false);
	});

	it('shows the new access until the access list of the saved version arrives', async () => {
		await setup();
		mocks.saveInstancePolicy.mockResolvedValue({ ...nodePolicy(2), warnings: [] });
		const { types, changeAccess } = useInstanceTypeAccess('node');
		await waitFor(() => expect(types.value).toHaveLength(1));

		const change = changeAccess('n8n-nodes-base.slack', 'deny');
		expect(types.value[0].access).toBe('deny');
		await change;

		// The read after the save still answers with version 1, so the pick must stay.
		expect(types.value[0].access).toBe('deny');

		// Another admin allows it again. The list of that version replaces the pick.
		mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(3));
		mocks.fetchInstanceAccess.mockResolvedValue(nodeAccess(3));
		await useInstancePolicyStore().load(['node']);
		await waitFor(() => expect(types.value[0].access).toBe('allow'));
	});

	it('keeps a later pick on the same row when an earlier save fails', async () => {
		await setup();
		const firstSave = createDeferredPromise<InstancePolicy<'node'> & { warnings: [] }>();
		mocks.saveInstancePolicy
			.mockReturnValueOnce(firstSave.promise)
			.mockResolvedValue({ ...nodePolicy(3), warnings: [] });
		const { types, changeAccess } = useInstanceTypeAccess('node');
		await waitFor(() => expect(types.value).toHaveLength(1));

		// A failed save drops its pick, but only its own, not the one made after it.
		const first = changeAccess('n8n-nodes-base.slack', 'delegate');
		const second = changeAccess('n8n-nodes-base.slack', 'deny');
		firstSave.reject(new ResponseError('boom', { httpStatusCode: 500 }));
		await first;

		expect(types.value[0].access).toBe('deny');
		await second;
	});

	it('shows the server value again when the page cannot edit the policy', async () => {
		await setup();
		mocks.saveInstancePolicy.mockRejectedValue(
			new ResponseError('several documents', { httpStatusCode: 409 }),
		);
		const { types, changeAccess } = useInstanceTypeAccess('node');
		await waitFor(() => expect(types.value).toHaveLength(1));

		await changeAccess('n8n-nodes-base.slack', 'deny');

		expect(types.value[0].access).toBe('allow');
	});
});
