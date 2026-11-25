import type { CredentialTypeUsageResponse, InstanceTypeAccessResponse } from '@n8n/api-types';
import {
	createComponentRenderer,
	waitAllPromises as flushPromises,
} from '@n8n/frontend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { ResponseError } from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CredentialTypesTab from './CredentialTypesTab.vue';
import { useInstancePolicyStore } from './instance-policy.store';
import type { InstancePolicy } from '../type-availability-policies.api';
import { findPopupItem, MENU_ITEM, OPTION } from '../__tests__/popups';
import { accessFilter, policyTableCells, rowCheckbox } from '../__tests__/table';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	setInstanceTypeAccess: vi.fn(),
	fetchInstanceAccess: vi.fn(),
	fetchCredentialTypeSummaries: vi.fn(),
	fetchCredentialTypeUsage: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => mocks);

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError, showMessage: mocks.showMessage }),
}));

const policy = (
	version: number,
	rules: InstancePolicy<'credential'>['rules'] = [],
): InstancePolicy<'credential'> => ({ scopeId: 'scope-1', rules, defaultAction: 'allow', version });

const access = (
	version: number,
	types: InstanceTypeAccessResponse['types'] = [
		{ name: 'bitlyApi', access: 'allow', matchedRuleId: null },
		{ name: 'notionApi', access: 'deny', matchedRuleId: 'rule-1' },
	],
): InstanceTypeAccessResponse => ({ scopeId: 'scope-1', version, defaultAction: 'allow', types });

const renderTab = createComponentRenderer(CredentialTypesTab);

const setup = async (arrangeAccessReads?: () => void) => {
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(['credentialTypePolicy:manage']);
	vi.spyOn(useTypeAvailabilityPoliciesStore(), 'reload').mockResolvedValue();
	arrangeAccessReads?.();
	await useInstancePolicyStore().load(['credential']);
	return renderTab({ pinia });
};

const { accessCell, usageCells } = policyTableCells('bitlyApi');

const restrictBitly = async (getByTestId: (id: string) => HTMLElement) => {
	await userEvent.click(accessCell(getByTestId));
	await userEvent.click(await findPopupItem(MENU_ITEM, 'Restricted'));
};

describe('CredentialTypesTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchInstancePolicy.mockResolvedValue(policy(1));
		mocks.fetchInstanceAccess.mockResolvedValue(access(1));
		mocks.fetchCredentialTypeUsage.mockResolvedValue({
			bitlyApi: { uses: 3, workflows: 2, activeWorkflows: 1, projects: 1 },
		} satisfies CredentialTypeUsageResponse);
		mocks.fetchCredentialTypeSummaries.mockResolvedValue(
			new Map([
				['bitlyApi', { displayName: 'Bitly API', iconUrl: 'icons/bitly.svg' }],
				['notionApi', { displayName: 'Notion API' }],
			]),
		);
	});

	it('lists every credential type with its display name and access', async () => {
		const { findByText, getByTestId } = await setup();

		expect(await findByText('Bitly API')).toBeInTheDocument();
		expect(await findByText('Notion API')).toBeInTheDocument();
		expect(mocks.fetchInstanceAccess).toHaveBeenCalledWith(expect.anything(), 'credential');
		expect(accessCell(getByTestId, 'notionApi')).toHaveTextContent('Restricted');
	});

	it('shows the type name when the display names do not load', async () => {
		const summaries = createDeferredPromise<Map<string, unknown>>();
		mocks.fetchCredentialTypeSummaries.mockReturnValue(summaries.promise);
		const { findByText, getByText } = await setup();
		await findByText('bitlyApi');

		summaries.reject(new Error('offline'));
		await summaries.promise.catch(() => {});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getByText('bitlyApi')).toBeInTheDocument();
		expect(mocks.showError).not.toHaveBeenCalled();
	});

	it('shows the usage of each credential type', async () => {
		const { findByText, getByTestId } = await setup();
		await findByText('Bitly API');

		await waitFor(() => expect(usageCells(getByTestId)).toEqual(['1', '3', '2', '1']));
		expect(mocks.fetchCredentialTypeUsage).toHaveBeenCalledTimes(1);
	});

	it('shows 0 usage for a credential type that no workflow uses', async () => {
		const { findByText, getByTestId } = await setup();
		await findByText('Notion API');

		await waitFor(() => expect(usageCells(getByTestId, 'notionApi')).toEqual(['0', '0', '0', '0']));
	});

	it('shows no usage value while the usage loads', async () => {
		const usage = createDeferredPromise<CredentialTypeUsageResponse>();
		mocks.fetchCredentialTypeUsage.mockReturnValue(usage.promise);
		const { findByText, getByTestId } = await setup();
		await findByText('Notion API');

		expect(usageCells(getByTestId, 'notionApi')).toEqual(['—', '—', '—', '—']);

		usage.resolve({});
		await waitFor(() => expect(usageCells(getByTestId, 'notionApi')).toEqual(['0', '0', '0', '0']));
	});

	it('shows the rows with no usage value when the usage does not load', async () => {
		mocks.fetchCredentialTypeUsage.mockRejectedValue(new Error('offline'));
		const { findByText, getByTestId } = await setup();
		await findByText('Bitly API');
		await waitFor(() => expect(mocks.fetchCredentialTypeUsage).toHaveBeenCalled());
		await flushPromises();

		expect(accessCell(getByTestId, 'notionApi')).toHaveTextContent('Restricted');
		expect(usageCells(getByTestId)).toEqual(['—', '—', '—', '—']);
		expect(usageCells(getByTestId, 'notionApi')).toEqual(['—', '—', '—', '—']);
		expect(mocks.showError).not.toHaveBeenCalled();
	});

	it('shows the usage when only the display names do not load', async () => {
		mocks.fetchCredentialTypeSummaries.mockRejectedValue(new Error('offline'));
		const { findByText, getByTestId } = await setup();
		await findByText('bitlyApi');

		await waitFor(() => expect(usageCells(getByTestId)).toEqual(['1', '3', '2', '1']));
	});

	it('sends the access of only the changed credential type', async () => {
		// No workflow uses the type, so the change applies with no review.
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		mocks.fetchInstancePolicy.mockResolvedValue(policy(1));
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });
		const { findByText, getByTestId } = await setup(() =>
			mocks.fetchInstanceAccess.mockResolvedValueOnce(access(1)).mockResolvedValue(
				access(2, [
					{ name: 'bitlyApi', access: 'deny', matchedRuleId: 'new' },
					{ name: 'notionApi', access: 'deny', matchedRuleId: 'rule-1' },
				]),
			),
		);
		await findByText('Bitly API');

		await restrictBitly(getByTestId);

		await waitFor(() =>
			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledWith(expect.anything(), 'credential', {
				changes: [{ type: 'bitlyApi', access: 'deny' }],
				version: 1,
			}),
		);
		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
		expect(mocks.fetchInstancePolicy).not.toHaveBeenCalledWith(expect.anything(), 'node');
		// The change applies at once: no dialog asks the admin to confirm it.
		expect(document.querySelector('[role="dialog"],[role="alertdialog"]')).toBeNull();
		// After the save, the store reads the access list again.
		await waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2));
		expect(accessCell(getByTestId)).toHaveTextContent('Restricted');
	});

	it('moves the focus to the access filter when a changed row leaves the filter', async () => {
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });
		const { findByText, getByTestId, queryByTestId, getByRole } = await setup();
		await findByText('Bitly API');
		const filter = accessFilter(getByRole);
		await userEvent.click(filter);
		await userEvent.click(await findPopupItem(OPTION, 'Allowed (1)'));
		const counts = createDeferredPromise<CredentialTypeUsageResponse>();
		mocks.fetchCredentialTypeUsage.mockReturnValue(counts.promise);

		await restrictBitly(getByTestId);
		await waitFor(() => expect(accessCell(getByTestId)).toHaveFocus());
		counts.resolve({});

		await waitFor(() => expect(filter).toHaveFocus());
		expect(queryByTestId('instance-policy-open-bitlyApi')).not.toBeInTheDocument();
	});

	it('keeps the focus in the row when a changed row stays in the table', async () => {
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });
		const { findByText, getByTestId } = await setup();
		await findByText('Bitly API');

		await restrictBitly(getByTestId);

		await waitFor(() => expect(accessCell(getByTestId)).toHaveTextContent('Restricted'));
		await waitFor(() => expect(accessCell(getByTestId)).toHaveFocus());
	});

	it('shows the saved value again when the save fails', async () => {
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('boom', { httpStatusCode: 500 }),
		);
		const { findByText, getByTestId } = await setup();
		await findByText('Bitly API');

		await restrictBitly(getByTestId);

		await waitFor(() => expect(mocks.showError).toHaveBeenCalled());
		await waitFor(() => expect(accessCell(getByTestId)).toHaveTextContent('Allowed'));
		expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(1);
	});

	it('loads the access list again when the policy changed after the page loaded', async () => {
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('stale', { httpStatusCode: 409 }),
		);
		mocks.fetchInstancePolicy.mockResolvedValueOnce(policy(1)).mockResolvedValue(policy(5));
		const { findByText, getByTestId } = await setup(() =>
			mocks.fetchInstanceAccess
				.mockResolvedValueOnce(access(1))
				.mockResolvedValue(
					access(5, [{ name: 'bitlyApi', access: 'deny', matchedRuleId: 'other-admin' }]),
				),
		);
		await findByText('Bitly API');

		await restrictBitly(getByTestId);

		// After the save, the store reads the access list again.
		await waitFor(() => expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(accessCell(getByTestId)).toHaveTextContent('Restricted'));
		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
	});

	it('shows the saved value again when the page cannot edit the policy', async () => {
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('several documents', { httpStatusCode: 409 }),
		);
		const { findByText, getByTestId } = await setup();
		await findByText('Bitly API');

		await restrictBitly(getByTestId);

		await waitFor(() => expect(mocks.showMessage).toHaveBeenCalled());
		await waitFor(() => expect(accessCell(getByTestId)).toHaveTextContent('Allowed'));
	});

	it('shows a type that a rule leaves open to project opt-in as read-only', async () => {
		mocks.fetchInstanceAccess.mockResolvedValue(
			access(1, [{ name: 'bitlyApi', access: 'delegate', matchedRuleId: 'rule-1' }]),
		);

		const { findByText, getByTestId } = await setup();
		await findByText('Bitly API');

		const cell = getByTestId('instance-policy-access-bitlyApi');
		expect(cell).toHaveTextContent('Open to project opt-in');
		expect(within(cell).queryByRole('button')).not.toBeInTheDocument();
	});

	it('tells the admin when the access list does not load', async () => {
		mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));

		await setup();

		await waitFor(() =>
			expect(mocks.showError).toHaveBeenCalledWith(
				expect.any(Error),
				'Could not load the access of the types',
			),
		);
	});

	it('keeps rows editable when the default action leaves types open to project opt-in', async () => {
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		mocks.fetchInstanceAccess.mockResolvedValue(
			access(1, [{ name: 'bitlyApi', access: 'delegate', matchedRuleId: null }]),
		);

		mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });
		const { findByText, getByTestId } = await setup();
		await findByText('Bitly API');

		expect(accessCell(getByTestId)).toHaveAccessibleName('Access of Bitly API');
		await restrictBitly(getByTestId);

		await waitFor(() =>
			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledWith(
				expect.anything(),
				'credential',
				expect.objectContaining({ changes: [{ type: 'bitlyApi', access: 'deny' }] }),
			),
		);
	});

	it('allows the selected credential types at once with no review, then clears the selection', async () => {
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });
		const { findByRole, getByRole, getByTestId, queryByTestId } = await setup();
		// Waits for the rows to render.
		await findByRole('checkbox', { name: 'Select Bitly API' });
		await userEvent.click(rowCheckbox(getByRole, 'Bitly API'));
		await userEvent.click(rowCheckbox(getByRole, 'Notion API'));

		await userEvent.click(getByTestId('policy-bulk-allow'));

		await waitFor(() => expect(queryByTestId('selected-items-info')).not.toBeInTheDocument());
		expect(accessCell(getByTestId, 'notionApi')).toHaveTextContent('Allowed');
		// Bitly API is already allowed, so the save leaves it out.
		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
		expect(mocks.setInstanceTypeAccess.mock.calls[0][2].changes).toEqual([
			{ type: 'notionApi', access: 'allow' },
		]);
	});
});
