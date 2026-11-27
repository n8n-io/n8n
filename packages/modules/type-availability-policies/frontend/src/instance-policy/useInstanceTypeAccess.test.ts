import type { InstanceTypeAccessResponse } from '@n8n/api-types';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { waitFor } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useInstancePolicyStore } from './instance-policy.store';
import { useRestrictReviewStore } from './restrict-review/restrict-review.store';
import { useInstanceTypeAccess } from './useInstanceTypeAccess';
import type { InstancePolicy } from '../type-availability-policies.api';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	setInstanceTypeAccess: vi.fn(),
	fetchInstanceAccess: vi.fn(),
	fetchNodeTypeUsage: vi.fn(),
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
	await useInstancePolicyStore().loadUsage('node');
};

describe('useInstanceTypeAccess', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(1));
		mocks.fetchInstanceAccess.mockResolvedValue(nodeAccess(1));
		mocks.fetchNodeTypeUsage.mockResolvedValue({});
	});

	it('shows the access that the store read and saves a change through it', async () => {
		await setup();
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...nodePolicy(2), warnings: [] });

		const { types, changeAccess } = useInstanceTypeAccess('node');

		expect(types.value).toEqual([
			{
				name: 'n8n-nodes-base.slack',
				access: 'allow',
				matchedRuleId: null,
				editable: true,
				checking: false,
			},
		]);
		expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(1);

		await changeAccess('n8n-nodes-base.slack', 'deny', 'Slack');

		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledWith(expect.anything(), 'node', {
			changes: [{ type: 'n8n-nodes-base.slack', access: 'deny' }],
			version: 1,
		});
		// The store reads the access of the saved version once, and the composable does not read it.
		expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2);
	});

	it('is loading while the store reads the access after a save', async () => {
		await setup();
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...nodePolicy(2), warnings: [] });
		const read = createDeferredPromise<InstanceTypeAccessResponse>();
		mocks.fetchInstanceAccess.mockReturnValue(read.promise);
		const { loading, changeAccess } = useInstanceTypeAccess('node');
		expect(loading.value).toBe(false);

		const change = changeAccess('n8n-nodes-base.slack', 'deny', 'Slack');
		await waitFor(() => expect(loading.value).toBe(true));

		read.resolve(nodeAccess(2));
		await change;
		expect(loading.value).toBe(false);
	});

	it('shows the new access until the access list of the saved version arrives', async () => {
		await setup();
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...nodePolicy(2), warnings: [] });
		const { types, changeAccess } = useInstanceTypeAccess('node');
		await waitFor(() => expect(types.value).toHaveLength(1));

		const change = changeAccess('n8n-nodes-base.slack', 'deny', 'Slack');
		await waitFor(() => expect(types.value[0].access).toBe('deny'));
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
		mocks.setInstanceTypeAccess
			.mockReturnValueOnce(firstSave.promise)
			.mockResolvedValue({ ...nodePolicy(3), warnings: [] });
		const { types, changeAccess } = useInstanceTypeAccess('node');
		await waitFor(() => expect(types.value).toHaveLength(1));

		// A failed save drops its pick, but only its own, not the one made after it.
		const first = changeAccess('n8n-nodes-base.slack', 'delegate', 'Slack');
		const second = changeAccess('n8n-nodes-base.slack', 'deny', 'Slack');
		await waitFor(() => expect(types.value[0].access).toBe('deny'));
		firstSave.reject(new ResponseError('boom', { httpStatusCode: 500 }));
		await first;

		expect(types.value[0].access).toBe('deny');
		await second;
	});

	it('shows the server value again when the page cannot edit the policy', async () => {
		await setup();
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('several documents', { httpStatusCode: 409 }),
		);
		const { types, changeAccess } = useInstanceTypeAccess('node');
		await waitFor(() => expect(types.value).toHaveLength(1));

		await changeAccess('n8n-nodes-base.slack', 'deny', 'Slack');

		expect(types.value[0].access).toBe('allow');
	});
	describe('review before restricting a type in use', () => {
		const inUse = { uses: 3, workflows: 2, activeWorkflows: 0, projects: 1 };

		it('applies nothing until the admin confirms', async () => {
			mocks.fetchNodeTypeUsage.mockResolvedValue({ 'n8n-nodes-base.slack': inUse });
			await setup();
			mocks.setInstanceTypeAccess.mockResolvedValue({ ...nodePolicy(2), warnings: [] });
			const review = useRestrictReviewStore();
			const { types, changeAccess } = useInstanceTypeAccess('node');

			const change = changeAccess('n8n-nodes-base.slack', 'deny', 'Slack');
			await waitFor(() =>
				expect(review.request).toEqual({
					kind: 'node',
					name: 'n8n-nodes-base.slack',
					label: 'Slack',
					usage: inUse,
				}),
			);
			expect(types.value[0].access).toBe('allow');
			expect(mocks.setInstanceTypeAccess).not.toHaveBeenCalled();

			review.resolve(true);
			await change;

			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
			expect(review.request).toBeNull();
		});

		it('keeps the previous access when the admin cancels', async () => {
			mocks.fetchNodeTypeUsage.mockResolvedValue({ 'n8n-nodes-base.slack': inUse });
			await setup();
			const review = useRestrictReviewStore();
			const { types, changeAccess } = useInstanceTypeAccess('node');

			const change = changeAccess('n8n-nodes-base.slack', 'deny', 'Slack');
			await waitFor(() => expect(review.request).not.toBeNull());
			review.resolve(false);
			await change;

			expect(mocks.setInstanceTypeAccess).not.toHaveBeenCalled();
			expect(types.value[0].access).toBe('allow');
		});

		it('drops a restriction that waits for its counts when the admin picks Allowed', async () => {
			useSettingsStore().isModuleActive = vi.fn(() => true);
			useRBACStore().setGlobalScopes(['nodeTypePolicy:manage']);
			vi.spyOn(useTypeAvailabilityPoliciesStore(), 'reload').mockResolvedValue();
			await useInstancePolicyStore().load(['node']);
			const counts = createDeferredPromise<Record<string, typeof inUse>>();
			mocks.fetchNodeTypeUsage.mockReturnValue(counts.promise);
			mocks.setInstanceTypeAccess.mockResolvedValue({ ...nodePolicy(2), warnings: [] });
			const { changeAccess } = useInstanceTypeAccess('node');

			const restrict = changeAccess('n8n-nodes-base.slack', 'deny', 'Slack');
			await changeAccess('n8n-nodes-base.slack', 'allow', 'Slack');
			counts.resolve({});
			await restrict;

			expect(useRestrictReviewStore().request).toBeNull();
			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
			expect(mocks.setInstanceTypeAccess).not.toHaveBeenCalledWith(
				expect.anything(),
				'node',
				expect.objectContaining({ changes: [expect.objectContaining({ access: 'deny' })] }),
			);
		});

		it('marks the row as checking while its counts load', async () => {
			await setup();
			const counts = createDeferredPromise<Record<string, typeof inUse>>();
			mocks.fetchNodeTypeUsage.mockReturnValue(counts.promise);
			const review = useRestrictReviewStore();
			const { types, changeAccess } = useInstanceTypeAccess('node');

			const change = changeAccess('n8n-nodes-base.slack', 'deny', 'Slack');
			expect(types.value[0].checking).toBe(true);

			counts.resolve({ 'n8n-nodes-base.slack': inUse });
			await waitFor(() => expect(review.request).not.toBeNull());
			expect(types.value[0].checking).toBe(false);

			review.resolve(false);
			await change;
		});

		it('never asks before allowing a type', async () => {
			mocks.fetchNodeTypeUsage.mockResolvedValue({ 'n8n-nodes-base.slack': inUse });
			await setup();
			mocks.setInstanceTypeAccess.mockResolvedValue({ ...nodePolicy(2), warnings: [] });
			const { changeAccess } = useInstanceTypeAccess('node');

			await changeAccess('n8n-nodes-base.slack', 'allow', 'Slack');

			expect(useRestrictReviewStore().request).toBeNull();
			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
		});
	});

	describe('bulk change', () => {
		const SLACK = 'n8n-nodes-base.slack';
		const NOTION = 'n8n-nodes-base.notion';
		const GITHUB = 'n8n-nodes-base.github';
		const inUse = { uses: 3, workflows: 2, activeWorkflows: 1, projects: 1 };
		const unused = { uses: 0, workflows: 0, activeWorkflows: 0, projects: 0 };
		const selected = [
			{ name: SLACK, label: 'Slack' },
			{ name: NOTION, label: 'Notion' },
			{ name: GITHUB, label: 'GitHub' },
		];

		const threeTypes = (version: number): InstanceTypeAccessResponse => ({
			...nodeAccess(version),
			types: [
				{ name: SLACK, access: 'deny', matchedRuleId: null },
				{ name: NOTION, access: 'deny', matchedRuleId: null },
				{ name: GITHUB, access: 'allow', matchedRuleId: null },
			],
		});

		const allAllowed: InstanceTypeAccessResponse = {
			...threeTypes(1),
			types: threeTypes(1).types.map((type) => ({ ...type, access: 'allow' })),
		};

		const sentChanges = () =>
			mocks.setInstanceTypeAccess.mock.calls.flatMap((call) => call[2].changes);

		beforeEach(() => {
			mocks.fetchInstanceAccess.mockResolvedValue(threeTypes(1));
			mocks.fetchNodeTypeUsage.mockResolvedValue({
				[SLACK]: inUse,
				[NOTION]: unused,
				[GITHUB]: inUse,
			});
			mocks.setInstanceTypeAccess.mockResolvedValue({ ...nodePolicy(2), warnings: [] });
		});

		it('allows the selected types in one save, with no review, and shows them at once', async () => {
			await setup();
			const { types, changeAccessMany } = useInstanceTypeAccess('node');

			const change = changeAccessMany(selected, 'allow');
			expect(types.value.map((type) => type.access)).toEqual(['allow', 'allow', 'allow']);

			expect(await change).toBe(true);
			expect(useRestrictReviewStore().bulkRequest).toBeNull();
			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
			// GitHub is already allowed, so the save leaves it out.
			expect(sentChanges()).toEqual([
				{ type: SLACK, access: 'allow' },
				{ type: NOTION, access: 'allow' },
			]);
		});

		it('asks once for the restricted types in use and restricts all of them on confirm', async () => {
			mocks.fetchInstanceAccess.mockResolvedValue(allAllowed);
			await setup();
			const review = useRestrictReviewStore();
			const { changeAccessMany } = useInstanceTypeAccess('node');

			const change = changeAccessMany(selected, 'deny');
			await waitFor(() =>
				expect(review.bulkRequest).toEqual({
					kind: 'node',
					total: 3,
					items: [
						{ name: SLACK, label: 'Slack', usage: inUse },
						{ name: GITHUB, label: 'GitHub', usage: inUse },
					],
				}),
			);
			expect(mocks.setInstanceTypeAccess).not.toHaveBeenCalled();

			review.resolve(true);

			expect(await change).toBe(true);
			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
			expect(sentChanges()).toEqual([
				{ type: SLACK, access: 'deny' },
				{ type: NOTION, access: 'deny' },
				{ type: GITHUB, access: 'deny' },
			]);
		});

		it('changes nothing when the admin cancels the review', async () => {
			mocks.fetchInstanceAccess.mockResolvedValue(allAllowed);
			await setup();
			const review = useRestrictReviewStore();
			const { types, changeAccessMany } = useInstanceTypeAccess('node');

			const change = changeAccessMany(selected, 'deny');
			await waitFor(() => expect(review.bulkRequest).not.toBeNull());
			review.resolve(false);

			expect(await change).toBe(false);
			expect(mocks.setInstanceTypeAccess).not.toHaveBeenCalled();
			expect(types.value.map((type) => type.access)).toEqual(['allow', 'allow', 'allow']);
		});

		it('restricts with no review when no selected type is in use', async () => {
			mocks.fetchNodeTypeUsage.mockResolvedValue({});
			await setup();

			expect(await useInstanceTypeAccess('node').changeAccessMany(selected, 'deny')).toBe(true);
			expect(useRestrictReviewStore().bulkRequest).toBeNull();
			expect(sentChanges()).toEqual([{ type: GITHUB, access: 'deny' }]);
		});

		it('leaves out read-only types and saves nothing when no type needs the change', async () => {
			mocks.fetchInstanceAccess.mockResolvedValue({
				...threeTypes(1),
				types: [
					{ name: SLACK, access: 'delegate', matchedRuleId: 'rule-1' },
					{ name: GITHUB, access: 'allow', matchedRuleId: null },
				],
			});
			await setup();

			expect(await useInstanceTypeAccess('node').changeAccessMany(selected, 'allow')).toBe(false);
			expect(mocks.setInstanceTypeAccess).not.toHaveBeenCalled();
		});

		it('shows the server values again when the policy changed', async () => {
			await setup();
			mocks.setInstanceTypeAccess.mockRejectedValue(
				new ResponseError('Conflict', { httpStatusCode: 409 }),
			);
			mocks.fetchInstancePolicy.mockResolvedValue(nodePolicy(2));
			mocks.fetchInstanceAccess.mockResolvedValue(threeTypes(2));
			const { types, changeAccessMany } = useInstanceTypeAccess('node');

			expect(await changeAccessMany(selected, 'allow')).toBe(false);
			expect(types.value.map((type) => type.access)).toEqual(['deny', 'deny', 'allow']);
		});

		it('shows the server values again and changes no type when the save fails', async () => {
			await setup();
			mocks.setInstanceTypeAccess.mockRejectedValue(
				new ResponseError('Internal error', { httpStatusCode: 500 }),
			);
			const { types, changeAccessMany } = useInstanceTypeAccess('node');

			expect(await changeAccessMany(selected, 'allow')).toBe(false);
			expect(types.value.map((type) => type.access)).toEqual(['deny', 'deny', 'allow']);
		});

		it.each([
			{ title: 'with types to change', selection: selected, saved: true },
			{ title: 'with no type to change', selection: [selected[2]], saved: false },
		])(
			'ends a restriction that waits for its counts when the admin allows a selection $title',
			async ({ selection, saved }) => {
				await setup();
				const counts = createDeferredPromise<Record<string, typeof inUse>>();
				mocks.fetchNodeTypeUsage.mockReturnValue(counts.promise);
				const { changeAccess, changeAccessMany } = useInstanceTypeAccess('node');

				// GitHub shows Allowed while its restriction waits, so the bulk Allow has nothing to send for it.
				const restrict = changeAccess(GITHUB, 'deny', 'GitHub');
				expect(await changeAccessMany(selection, 'allow')).toBe(saved);
				counts.resolve({ [GITHUB]: inUse });
				await restrict;

				expect(useRestrictReviewStore().request).toBeNull();
				expect(sentChanges()).not.toContainEqual({ type: GITHUB, access: 'deny' });
			},
		);

		it('sends a type whose own save still runs, because that save can fail', async () => {
			await setup();
			let failSingle: (error: unknown) => void = () => {};
			mocks.setInstanceTypeAccess.mockImplementationOnce(
				async () =>
					await new Promise((_, reject) => {
						failSingle = reject;
					}),
			);
			const { types, changeAccess, changeAccessMany } = useInstanceTypeAccess('node');

			// Slack shows Allowed while its own save runs.
			const single = changeAccess(SLACK, 'allow', 'Slack');
			await vi.waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1));
			const bulk = changeAccessMany(selected, 'allow');
			failSingle(new ResponseError('Internal error', { httpStatusCode: 500 }));
			await single;

			expect(await bulk).toBe(true);
			expect(mocks.setInstanceTypeAccess.mock.calls[1][2].changes).toEqual([
				{ type: SLACK, access: 'allow' },
				{ type: NOTION, access: 'allow' },
			]);
			expect(types.value.map((type) => type.access)).toEqual(['allow', 'allow', 'allow']);
		});
	});
});
