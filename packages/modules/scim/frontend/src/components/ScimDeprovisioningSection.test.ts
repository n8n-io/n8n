import type { ScimConfigResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/vue';

import ScimDeprovisioningSection from './ScimDeprovisioningSection.vue';
import { useScimStore } from '../scim.store';

/**
 * A native select in place of the reka-based `N8nSelect2`, so the tests can
 * change a value without driving a popover in jsdom. It keeps the props the
 * section uses: `modelValue`, `items` and the `update:modelValue` emit.
 */
const { SelectStub } = await vi.hoisted(async () => {
	const { defineComponent, h } = await import('vue');
	const SelectStub = defineComponent({
		props: {
			modelValue: { type: [String, Number], default: undefined },
			items: { type: Array, default: () => [] },
			disabled: { type: Boolean, default: false },
		},
		emits: ['update:modelValue'],
		setup(props, { emit, attrs }) {
			return () =>
				h(
					'select',
					{
						...attrs,
						value: props.modelValue,
						disabled: props.disabled,
						onChange: (event: Event) => {
							const target = event.target as HTMLSelectElement;
							emit('update:modelValue', target.value);
							// Controlled, like the real component: the DOM shows `modelValue`, not the pick.
							target.value = String(props.modelValue ?? '');
						},
					},
					(props.items as Array<{ value: string; label: string }>).map((item) =>
						h(
							'option',
							{ value: item.value, selected: item.value === props.modelValue },
							item.label,
						),
					),
				);
		},
	});
	return { SelectStub };
});

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return { ...actual, N8nSelect2: SelectStub };
});

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const telemetryTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

type ApiMock = (...args: unknown[]) => Promise<unknown>;
const getScimConfigMock = vi.fn<ApiMock>();
const updateScimConfigMock = vi.fn<ApiMock>();
const fetchScimTransferTargetsMock = vi.fn<ApiMock>();

vi.mock('../scim.api', () => ({
	getScimConfig: async (...args: unknown[]) => await getScimConfigMock(...args),
	updateScimConfig: async (...args: unknown[]) => await updateScimConfigMock(...args),
	generateScimToken: vi.fn(),
	revokeScimToken: vi.fn(),
	fetchScimTransferTargets: async (...args: unknown[]) =>
		await fetchScimTransferTargetsMock(...args),
}));

const makeConfig = (overrides: Partial<ScimConfigResponse> = {}): ScimConfigResponse => ({
	enabled: true,
	hasToken: true,
	tokenHint: '3f2a',
	baseUrl: 'https://n8n.example.com/scim/v2',
	token: { createdAt: '2026-06-12T10:00:00.000Z', createdBy: null, lastUsedAt: null },
	lastAuthFailure: null,
	status: 'waiting',
	provisionedCount: 0,
	deactivatedCount: 0,
	onDelete: 'disable',
	dataAction: 'transfer',
	transferTarget: null,
	...overrides,
});

const person = {
	projectId: 'p-jan',
	userId: 'u-jan',
	firstName: 'Jan',
	lastName: 'Kowalski',
	email: 'jan@acme.io',
	role: 'global:owner',
};

const project = {
	projectId: 'p-finance',
	name: 'Finance',
	icon: { type: 'emoji', value: '💰' } as const,
	memberCount: 5,
	workflowCount: 23,
};

const render = async (config: ScimConfigResponse) => {
	const pinia = createTestingPinia({ stubActions: false });
	const scimStore = useScimStore(pinia);
	getScimConfigMock.mockResolvedValue(config);
	await scimStore.fetchConfig();
	const renderer = createComponentRenderer(ScimDeprovisioningSection, { pinia });
	return { scimStore, ...renderer({ props: { config } }) };
};

const select = (testId: string) => screen.getByTestId(testId) as HTMLSelectElement;

describe('ScimDeprovisioningSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// `clearAllMocks` keeps queued `mockResolvedValueOnce` values; a reset drops them.
		for (const mock of [getScimConfigMock, updateScimConfigMock, fetchScimTransferTargetsMock]) {
			mock.mockReset();
		}
		fetchScimTransferTargetsMock.mockResolvedValue({
			people: { total: 1, count: 1, items: [person] },
			projects: { total: 1, count: 1, items: [project] },
		});
		updateScimConfigMock.mockResolvedValue({});
	});

	it('shows the stored action and hides the data rows while users are disabled', async () => {
		await render(makeConfig({ onDelete: 'disable' }));

		expect(select('scim-on-delete-select').value).toBe('disable');
		expect(screen.queryByTestId('scim-data-action-select')).not.toBeInTheDocument();
		expect(screen.queryByTestId('scim-transfer-target-row')).not.toBeInTheDocument();
	});

	it('shows the data rows and the stored target while users are deleted with a transfer', async () => {
		await render(
			makeConfig({
				onDelete: 'delete',
				dataAction: 'transfer',
				transferTarget: {
					projectId: 'p-jan',
					kind: 'person',
					name: 'Jan Kowalski',
					email: 'jan@acme.io',
					valid: true,
				},
			}),
		);

		expect(select('scim-data-action-select').value).toBe('transfer');
		expect(screen.getByTestId('scim-transfer-target-name')).toHaveTextContent('Jan Kowalski');
		// The avatar reads the name reactively, so it shows the initials of the stored target.
		expect(screen.getByTestId('scim-transfer-target-row')).toHaveTextContent('JK');
		expect(screen.queryByTestId('scim-transfer-target-invalid')).not.toBeInTheDocument();
	});

	it('warns when the stored target is no longer valid', async () => {
		await render(
			makeConfig({
				onDelete: 'delete',
				dataAction: 'transfer',
				transferTarget: { projectId: 'gone', kind: null, name: null, valid: false },
			}),
		);

		expect(screen.getByTestId('scim-transfer-target-invalid')).toBeInTheDocument();
		expect(screen.getByTestId('scim-transfer-target-name')).toHaveTextContent('The instance owner');
	});

	it('saves only onDelete when switching to Disable user, with one toast', async () => {
		const closeFirst = vi.fn();
		showMessage.mockReturnValueOnce({ close: closeFirst }).mockReturnValue({ close: vi.fn() });
		const { rerender } = await render(makeConfig({ onDelete: 'delete', dataAction: 'delete' }));
		getScimConfigMock.mockResolvedValue(makeConfig({ onDelete: 'disable', dataAction: 'delete' }));

		await userEvent.selectOptions(select('scim-on-delete-select'), 'disable');

		await waitFor(() => expect(updateScimConfigMock).toHaveBeenCalledTimes(1));
		expect(updateScimConfigMock).toHaveBeenCalledWith(expect.anything(), { onDelete: 'disable' });
		expect(showMessage).toHaveBeenCalledWith({ type: 'success', title: 'Changes saved' });
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.SCIM.SCIM_DEPROVISIONING_SETTING_CHANGED,
			{
				on_delete: 'disable',
				data_action: 'delete',
				transfer_target_type: undefined,
				result: 'success',
			},
		);

		await rerender({ config: makeConfig({ onDelete: 'disable', dataAction: 'delete' }) });
		expect(screen.queryByTestId('scim-data-action-select')).not.toBeInTheDocument();

		// A second change replaces the first toast instead of stacking a second one.
		getScimConfigMock.mockResolvedValue(makeConfig({ onDelete: 'delete', dataAction: 'delete' }));
		await rerender({ config: makeConfig({ onDelete: 'delete', dataAction: 'delete' }) });
		await userEvent.selectOptions(select('scim-data-action-select'), 'delete');
	});

	it('opens the delete users dialog instead of saving when switching to Delete user', async () => {
		await render(makeConfig({ onDelete: 'disable' }));

		await userEvent.selectOptions(select('scim-on-delete-select'), 'delete');

		expect(await screen.findByRole('dialog', { name: 'Delete users' })).toBeInTheDocument();
		expect(updateScimConfigMock).not.toHaveBeenCalled();
	});

	it('saves onDelete and dataAction in one request when the dialog chooses Delete with the account', async () => {
		await render(makeConfig({ onDelete: 'disable' }));
		getScimConfigMock.mockResolvedValue(makeConfig({ onDelete: 'delete', dataAction: 'delete' }));

		await userEvent.selectOptions(select('scim-on-delete-select'), 'delete');
		const dialog = await screen.findByRole('dialog', { name: 'Delete users' });
		await userEvent.click(within(dialog).getByTestId('scim-delete-users-delete'));
		await userEvent.click(within(dialog).getByTestId('scim-delete-users-save'));

		await waitFor(() => expect(updateScimConfigMock).toHaveBeenCalledTimes(1));
		expect(updateScimConfigMock).toHaveBeenCalledWith(expect.anything(), {
			onDelete: 'delete',
			dataAction: 'delete',
		});
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.SCIM.SCIM_DELETE_USERS_DIALOG_CLOSED,
			{ outcome: 'delete', target_type: undefined },
		);
	});

	it('sends nothing and keeps Disable user when the dialog is cancelled', async () => {
		await render(makeConfig({ onDelete: 'disable' }));

		await userEvent.selectOptions(select('scim-on-delete-select'), 'delete');
		const dialog = await screen.findByRole('dialog', { name: 'Delete users' });
		await userEvent.click(within(dialog).getByTestId('scim-delete-users-cancel'));

		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Delete users' })).not.toBeInTheDocument(),
		);
		expect(updateScimConfigMock).not.toHaveBeenCalled();
		expect(select('scim-on-delete-select').value).toBe('disable');
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.SCIM.SCIM_DELETE_USERS_DIALOG_CLOSED,
			{ outcome: 'cancel' },
		);
	});

	it('shows an error toast and keeps the old value when a save fails', async () => {
		updateScimConfigMock.mockRejectedValue(new Error('boom'));
		await render(makeConfig({ onDelete: 'delete', dataAction: 'transfer' }));

		await userEvent.selectOptions(select('scim-data-action-select'), 'delete');

		await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
		expect(showMessage).not.toHaveBeenCalled();
		expect(select('scim-data-action-select').value).toBe('transfer');
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.SCIM.SCIM_DEPROVISIONING_SETTING_CHANGED,
			expect.objectContaining({ result: 'error' }),
		);
	});

	it('opens the transfer dialog from the pencil with Save disabled until a new pick', async () => {
		await render(
			makeConfig({
				onDelete: 'delete',
				dataAction: 'transfer',
				transferTarget: {
					projectId: 'p-jan',
					kind: 'person',
					name: 'Jan Kowalski',
					email: 'jan@acme.io',
					valid: true,
				},
			}),
		);

		await userEvent.click(screen.getByTestId('scim-transfer-target-change'));

		const dialog = await screen.findByRole('dialog', { name: 'Transfer resources' });
		expect(within(dialog).getByTestId('scim-transfer-save')).toBeDisabled();
		expect(updateScimConfigMock).not.toHaveBeenCalled();
	});
});
