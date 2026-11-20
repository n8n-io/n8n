import type { InstanceTypeAccessResponse } from '@n8n/api-types';
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
import NodeTypesTab from './NodeTypesTab.vue';
import { findPopupItem, MENU_ITEM } from '../__tests__/popups';
import type { InstancePolicy, NodeTypeSummary } from '../type-availability-policies.api';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	saveInstancePolicy: vi.fn(),
	fetchInstanceAccess: vi.fn(),
	fetchNodeTypeSummaries: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => mocks);

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError, showMessage: mocks.showMessage }),
}));

const SLACK = 'n8n-nodes-base.slack';
const SLACK_TRIGGER = 'n8n-nodes-base.slackTrigger';
const HIDDEN = 'n8n-nodes-base.internalThing';
const NOT_LOADED = 'n8n-nodes-base.notLoaded';

const summary = (displayName: string, fields: Partial<NodeTypeSummary> = {}): NodeTypeSummary => ({
	displayName,
	hidden: false,
	...fields,
});

const SUMMARIES = new Map([
	[SLACK, summary('Slack', { icon: 'fa:slack' })],
	[SLACK_TRIGGER, summary('Slack Trigger')],
	[HIDDEN, summary('Internal thing', { hidden: true })],
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
		{ name: HIDDEN, access: 'allow', matchedRuleId: null },
		{ name: NOT_LOADED, access: 'deny', matchedRuleId: 'rule-1' },
	],
): InstanceTypeAccessResponse => ({ scopeId: 'scope-1', version, defaultAction: 'allow', types });

const renderTab = createComponentRenderer(NodeTypesTab);

const setup = async (arrangeTabReads?: () => void) => {
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(['nodeTypePolicy:manage']);
	vi.spyOn(useTypeAvailabilityPoliciesStore(), 'reload').mockResolvedValue();
	await useInstancePolicyStore().load(['node']);
	// The store reads the access list on load too. The tests arrange and count only the reads of the tab.
	mocks.fetchInstanceAccess.mockClear();
	arrangeTabReads?.();
	return renderTab({ pinia });
};

const accessCell = (getByTestId: (id: string) => HTMLElement, name = SLACK) =>
	getByTestId(`instance-policy-access-${name}`);

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
	});

	it('gives a node type and its trigger a row each, with their access', async () => {
		const { findByText, getByText, getByTestId } = await setup();

		expect(await findByText('Slack')).toBeInTheDocument();
		expect(getByText('Slack Trigger')).toBeInTheDocument();
		expect(accessCell(getByTestId)).toHaveTextContent('Allowed');
		expect(mocks.fetchInstanceAccess).toHaveBeenCalledWith(expect.anything(), 'node');
	});

	it('gives no row to a hidden node type', async () => {
		const { findByText, queryByText } = await setup();
		await findByText('Slack');

		expect(queryByText('Internal thing')).not.toBeInTheDocument();
		expect(queryByText(HIDDEN)).not.toBeInTheDocument();
	});

	it('gives a row to a hidden node type that a name rule decides, so the admin can undo the rule', async () => {
		mocks.fetchInstancePolicy.mockResolvedValue(
			policy(1, [{ id: 'rule-1', action: 'deny', selector: { kind: 'name', value: HIDDEN } }]),
		);
		mocks.fetchInstanceAccess.mockResolvedValue(
			access(1, [
				{ name: SLACK, access: 'allow', matchedRuleId: null },
				{ name: HIDDEN, access: 'deny', matchedRuleId: 'rule-1' },
			]),
		);
		const { findByText, getByTestId } = await setup();

		expect(await findByText('Internal thing')).toBeInTheDocument();
		expect(accessCell(getByTestId, HIDDEN)).toHaveTextContent('Restricted');
	});

	it('keeps the row of a hidden node type while the access list reloads after a change', async () => {
		const hiddenRule = (id: string, action: 'allow' | 'deny') => ({
			id,
			action,
			selector: { kind: 'name' as const, value: HIDDEN },
		});
		mocks.fetchInstancePolicy.mockResolvedValue(policy(1, [hiddenRule('rule-1', 'deny')]));
		mocks.saveInstancePolicy.mockResolvedValue({
			...policy(2, [hiddenRule('rule-2', 'allow')]),
			warnings: [],
		});
		const reload = createDeferredPromise<InstanceTypeAccessResponse>();
		const { findByText, getByTestId, queryByText } = await setup(() =>
			mocks.fetchInstanceAccess
				.mockResolvedValueOnce(
					access(1, [{ name: HIDDEN, access: 'deny', matchedRuleId: 'rule-1' }]),
				)
				.mockReturnValue(reload.promise),
		);
		await findByText('Internal thing');

		await userEvent.click(accessCell(getByTestId, HIDDEN));
		await userEvent.click(await findPopupItem(MENU_ITEM, 'Allowed'));

		await waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2));
		expect(queryByText('Internal thing')).toBeInTheDocument();
	});

	it('gives no row to a hidden node type that a package rule decides', async () => {
		mocks.fetchInstancePolicy.mockResolvedValue(
			policy(1, [
				{ id: 'deny-base', action: 'deny', selector: { kind: 'package', value: 'n8n-nodes-base' } },
			]),
		);
		mocks.fetchInstanceAccess.mockResolvedValue(
			access(1, [
				{ name: SLACK, access: 'deny', matchedRuleId: 'deny-base' },
				{ name: HIDDEN, access: 'deny', matchedRuleId: 'deny-base' },
			]),
		);
		const { findByText, queryByText } = await setup();
		await findByText('Slack');

		expect(queryByText('Internal thing')).not.toBeInTheDocument();
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
		expect(queryByText(HIDDEN)).not.toBeInTheDocument();

		summaries.resolve(SUMMARIES);
		expect(await findByText('Slack')).toBeInTheDocument();
	});

	it('shows the type names when the node types do not load', async () => {
		mocks.fetchNodeTypeSummaries.mockRejectedValue(new Error('offline'));

		const { findByText } = await setup();

		expect(await findByText(SLACK)).toBeInTheDocument();
		expect(mocks.showError).not.toHaveBeenCalled();
	});

	it('restricts a node type at once', async () => {
		mocks.saveInstancePolicy.mockResolvedValue({ ...policy(2), warnings: [] });
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
			expect(mocks.saveInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'node', {
				defaultAction: 'allow',
				version: 1,
				rules: [
					{ id: expect.any(String), action: 'deny', selector: { kind: 'name', value: SLACK } },
				],
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

	it('keeps a rule on a Tool variant in front when it allows the node type', async () => {
		const denySlackTool = {
			id: 'deny-slack-tool',
			action: 'deny' as const,
			selector: { kind: 'name' as const, value: `${SLACK}Tool` },
		};
		const denyBasePackage = {
			id: 'deny-base',
			action: 'deny' as const,
			selector: { kind: 'package' as const, value: 'n8n-nodes-base' },
		};
		mocks.fetchInstancePolicy.mockResolvedValue(policy(1, [denySlackTool, denyBasePackage]));
		mocks.saveInstancePolicy.mockResolvedValue({ ...policy(2), warnings: [] });
		const { findByText, getByTestId } = await setup(() =>
			mocks.fetchInstanceAccess.mockResolvedValue(
				access(1, [{ name: SLACK, access: 'deny', matchedRuleId: denyBasePackage.id }]),
			),
		);
		await findByText('Slack');

		await userEvent.click(accessCell(getByTestId));
		await userEvent.click(await findPopupItem(MENU_ITEM, 'Allowed'));

		await waitFor(() =>
			expect(mocks.saveInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'node', {
				defaultAction: 'allow',
				version: 1,
				rules: [
					denySlackTool,
					{ id: expect.any(String), action: 'allow', selector: { kind: 'name', value: SLACK } },
					denyBasePackage,
				],
			}),
		);
	});

	it('loads the access list again when the policy changed after the page loaded', async () => {
		mocks.saveInstancePolicy.mockRejectedValue(new ResponseError('stale', { httpStatusCode: 409 }));
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
		expect(mocks.saveInstancePolicy).toHaveBeenCalledTimes(1);
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
});
