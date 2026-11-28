import type { InstanceTypeAccessResponse, NodeTypeUsageResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInstancePolicyStore } from './instance-policy.store';
import { useRestrictReviewStore } from './restrict-review/restrict-review.store';
import NodeTypesTab from './NodeTypesTab.vue';
import { findPopupItem, MENU_ITEM } from '../__tests__/popups';
import { policyTableCells, rowCheckbox, type GetByRole } from '../__tests__/table';
import type { InstancePolicy, NodeTypeSummary } from '../type-availability-policies.api';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	setInstanceTypeAccess: vi.fn(),
	fetchInstanceAccess: vi.fn(),
	fetchNodeTypeSummaries: vi.fn(),
	fetchNodeTypeUsage: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => mocks);

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError, showMessage: mocks.showMessage }),
}));

const SLACK = 'n8n-nodes-base.slack';
const SLACK_TRIGGER = 'n8n-nodes-base.slackTrigger';
const NOT_LOADED = 'n8n-nodes-base.notLoaded';

const summary = (displayName: string, fields: Partial<NodeTypeSummary> = {}): NodeTypeSummary => ({
	displayName,
	hidden: false,
	...fields,
});

const SUMMARIES = new Map([
	[SLACK, summary('Slack', { icon: 'fa:slack' })],
	[SLACK_TRIGGER, summary('Slack Trigger')],
]);

const policy = (
	version: number,
	rules: InstancePolicy<'node'>['rules'] = [],
): InstancePolicy<'node'> => ({ scopeId: 'scope-1', rules, defaultAction: 'allow', version });

const access = (
	version: number,
	types: InstanceTypeAccessResponse['types'] = [
		{ name: SLACK, access: 'allow', matchedRuleId: null },
		{ name: SLACK_TRIGGER, access: 'allow', matchedRuleId: null },
		{ name: NOT_LOADED, access: 'deny', matchedRuleId: 'rule-1' },
	],
): InstanceTypeAccessResponse => ({ scopeId: 'scope-1', version, defaultAction: 'allow', types });

const renderTab = createComponentRenderer(NodeTypesTab);

const setup = async (arrangeAccessReads?: () => void) => {
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(['nodeTypePolicy:manage']);
	vi.spyOn(useTypeAvailabilityPoliciesStore(), 'reload').mockResolvedValue();
	arrangeAccessReads?.();
	await useInstancePolicyStore().load(['node']);
	return renderTab({ pinia });
};

const { accessCell, usageCells } = policyTableCells(SLACK);

const restrict = async (getByTestId: (id: string) => HTMLElement, name = SLACK) => {
	await userEvent.click(accessCell(getByTestId, name));
	await userEvent.click(await findPopupItem(MENU_ITEM, 'Restricted'));
};

describe('NodeTypesTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchInstancePolicy.mockResolvedValue(policy(1));
		mocks.fetchInstanceAccess.mockResolvedValue(access(1));
		mocks.fetchNodeTypeSummaries.mockResolvedValue(SUMMARIES);
		mocks.fetchNodeTypeUsage.mockResolvedValue({
			[SLACK]: { uses: 3, workflows: 2, activeWorkflows: 1, projects: 1 },
		} satisfies NodeTypeUsageResponse);
	});

	// `useTypeUsage.test.ts` covers the loading and failure states.
	it('shows the usage of each node type, and 0 for a node type that no workflow uses', async () => {
		const { findByText, getByTestId } = await setup();

		await findByText('Slack Trigger');
		await waitFor(() => expect(usageCells(getByTestId)).toEqual(['1', '3', '2', '1']));
		expect(usageCells(getByTestId, SLACK_TRIGGER)).toEqual(['0', '0', '0', '0']);
		expect(mocks.fetchNodeTypeUsage).toHaveBeenCalledTimes(1);
	});

	it('gives a node type and its trigger a row each, with their access', async () => {
		const { findByText, getByText, getByTestId } = await setup();

		expect(await findByText('Slack')).toBeInTheDocument();
		expect(getByText('Slack Trigger')).toBeInTheDocument();
		expect(accessCell(getByTestId)).toHaveTextContent('Allowed');
		expect(mocks.fetchInstanceAccess).toHaveBeenCalledWith(expect.anything(), 'node');
	});

	it('shows the name of a node type that the editor did not load', async () => {
		const { findByText, getByTestId } = await setup();

		expect(await findByText(NOT_LOADED)).toBeInTheDocument();
		expect(accessCell(getByTestId, NOT_LOADED)).toHaveTextContent('Restricted');
	});

	it('shows no rows until the node types load', async () => {
		const summaries = createDeferredPromise<Map<string, NodeTypeSummary>>();
		mocks.fetchNodeTypeSummaries.mockReturnValue(summaries.promise);
		const { queryByText, findByText } = await setup();

		await waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalled());
		expect(queryByText(SLACK)).not.toBeInTheDocument();

		summaries.resolve(SUMMARIES);
		expect(await findByText('Slack')).toBeInTheDocument();
	});

	it('shows the type names when the node types do not load', async () => {
		mocks.fetchNodeTypeSummaries.mockRejectedValue(new Error('offline'));

		const { findByText } = await setup();

		expect(await findByText(SLACK)).toBeInTheDocument();
		expect(mocks.showError).not.toHaveBeenCalled();
	});

	it('restricts a node type that no workflow uses at once', async () => {
		mocks.fetchNodeTypeUsage.mockResolvedValue({});
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });
		const { findByText, getByTestId } = await setup(() =>
			mocks.fetchInstanceAccess.mockResolvedValueOnce(access(1)).mockResolvedValue(
				access(2, [
					{ name: SLACK, access: 'deny', matchedRuleId: 'new-rule' },
					{ name: SLACK_TRIGGER, access: 'allow', matchedRuleId: null },
				]),
			),
		);
		await findByText('Slack');

		await restrict(getByTestId);

		await waitFor(() =>
			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledWith(expect.anything(), 'node', {
				changes: [{ type: SLACK, access: 'deny' }],
				version: 1,
			}),
		);
		// The change applies at once: no dialog asks the admin to confirm it.
		expect(document.querySelector('[role="dialog"],[role="alertdialog"]')).toBeNull();
		// The row shows the access that the server reports after the save.
		await waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2));
		expect(accessCell(getByTestId)).toHaveTextContent('Restricted');
		// The trigger has a name of its own, so the rule on Slack does not change it.
		expect(accessCell(getByTestId, SLACK_TRIGGER)).toHaveTextContent('Allowed');
	});

	it('loads the access list again when the policy changed after the page loaded', async () => {
		mocks.fetchNodeTypeUsage.mockResolvedValue({});
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('stale', { httpStatusCode: 409 }),
		);
		mocks.fetchInstancePolicy.mockResolvedValueOnce(policy(1)).mockResolvedValue(policy(5));
		const { findByText, getByTestId } = await setup(() =>
			mocks.fetchInstanceAccess
				.mockResolvedValueOnce(access(1))
				.mockResolvedValue(
					access(5, [{ name: SLACK_TRIGGER, access: 'deny', matchedRuleId: 'other-admin' }]),
				),
		);
		await findByText('Slack');

		await restrict(getByTestId);

		await waitFor(() =>
			expect(accessCell(getByTestId, SLACK_TRIGGER)).toHaveTextContent('Restricted'),
		);
		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
	});

	it('shows a node type that a rule leaves open to project opt-in as read-only', async () => {
		mocks.fetchInstanceAccess.mockResolvedValue(
			access(1, [{ name: SLACK, access: 'delegate', matchedRuleId: 'rule-1' }]),
		);
		const { findByText, getByTestId } = await setup();
		await findByText('Slack');

		const cell = accessCell(getByTestId);
		expect(cell).toHaveTextContent('Open to project opt-in');
		expect(within(cell).queryByRole('button')).not.toBeInTheDocument();
	});

	it('names each Access dropdown after its node type', async () => {
		const { findByText, getByTestId } = await setup();
		await findByText('Slack');

		expect(accessCell(getByTestId)).toHaveAccessibleName('Access of Slack');
		expect(accessCell(getByTestId, SLACK_TRIGGER)).toHaveAccessibleName('Access of Slack Trigger');
	});

	describe('bulk change', () => {
		// The rows are read-only until the access loads.
		const selectBoth = async (getByRole: GetByRole) => {
			await waitFor(() => expect(rowCheckbox(getByRole, 'Slack')).toBeEnabled());
			await userEvent.click(rowCheckbox(getByRole, 'Slack'));
			await userEvent.click(rowCheckbox(getByRole, 'Slack Trigger'));
		};

		it('restricts the selection in one save after one review, then clears the selection', async () => {
			mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });
			const { getByRole, getByTestId, queryByTestId } = await setup();
			await selectBoth(getByRole);

			await userEvent.click(getByTestId('policy-bulk-restrict'));
			const review = useRestrictReviewStore();
			await waitFor(() =>
				expect(review.bulkRequest?.items.map(({ name }) => name)).toEqual([SLACK]),
			);
			review.resolve(true);

			await waitFor(() => expect(queryByTestId('selected-items-info')).not.toBeInTheDocument());
			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
			expect(mocks.setInstanceTypeAccess.mock.calls[0][2].changes).toEqual([
				{ type: SLACK, access: 'deny' },
				{ type: SLACK_TRIGGER, access: 'deny' },
			]);
		});

		it('keeps the selection and changes nothing when the admin cancels the review', async () => {
			const { getByRole, getByTestId } = await setup();
			await selectBoth(getByRole);

			await userEvent.click(getByTestId('policy-bulk-restrict'));
			const review = useRestrictReviewStore();
			await waitFor(() => expect(review.bulkRequest).not.toBeNull());
			review.resolve(false);

			await waitFor(() =>
				expect(getByTestId('policy-bulk-restrict')).not.toHaveAttribute('aria-disabled'),
			);
			expect(within(getByTestId('selected-items-info')).getByText('2 rows selected')).toBeVisible();
			expect(mocks.setInstanceTypeAccess).not.toHaveBeenCalled();
		});

		it('keeps the selection and says so when the policy changed after the page loaded', async () => {
			mocks.setInstanceTypeAccess.mockRejectedValue(
				new ResponseError('Policy scope has changed', { httpStatusCode: 409 }),
			);
			const { getByRole, getByTestId } = await setup();
			await selectBoth(getByRole);
			mocks.fetchInstancePolicy.mockResolvedValue(policy(2));
			// Another admin restricted Slack, so the row shows the access that the tab read again.
			mocks.fetchInstanceAccess.mockResolvedValue(
				access(2, [
					{ name: SLACK, access: 'deny', matchedRuleId: 'other-admin' },
					{ name: SLACK_TRIGGER, access: 'allow', matchedRuleId: null },
					{ name: NOT_LOADED, access: 'deny', matchedRuleId: 'rule-1' },
				]),
			);
			const accessReads = mocks.fetchInstanceAccess.mock.calls.length;

			await userEvent.click(getByTestId('policy-bulk-restrict'));
			await waitFor(() => expect(useRestrictReviewStore().bulkRequest).not.toBeNull());
			useRestrictReviewStore().resolve(true);

			await waitFor(() =>
				expect(mocks.showMessage).toHaveBeenCalledWith(
					expect.objectContaining({ type: 'warning' }),
				),
			);
			expect(mocks.fetchInstanceAccess.mock.calls.length).toBeGreaterThan(accessReads);
			await waitFor(() => expect(accessCell(getByTestId)).toHaveTextContent('Restricted'));
			expect(within(getByTestId('selected-items-info')).getByText('2 rows selected')).toBeVisible();
		});
	});
});
