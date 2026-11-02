import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { updateApp } from '../../apps.api';
import type { AppVersions } from '../../composables/useAppVersions';
import AppConfigureTabBasics from './AppConfigureTabBasics.vue';

vi.mock('../../apps.api');

const { confirm, showError } = vi.hoisted(() => ({ confirm: vi.fn(), showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	useMessage: () => ({ confirm }),
}));

const app = (name = 'Expense tracker', overrides: Partial<AppResponse> = {}): AppResponse => ({
	id: 'app-1',
	projectId: 'project-1',
	name,
	namespace: 'expenses',
	visibility: 'project',
	draftVersionId: null,
	publishedVersionId: null,
	publishedUrl: null,
	...overrides,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
});

const renderComponent = createComponentRenderer(AppConfigureTabBasics, {
	props: { app: app(), versions: {} as AppVersions },
});

function providePermissions(scopes: Scope[], readOnly = false) {
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => readOnly,
	});
}

describe('AppConfigureTabBasics', () => {
	afterEach(() => {
		capabilityRegistry.clear();
		vi.clearAllMocks();
	});

	it('saves the trimmed name on blur and emits the updated app', async () => {
		providePermissions(['app:update']);
		vi.mocked(updateApp).mockResolvedValue(app('Sales'));
		const { getByTestId, emitted } = renderComponent();

		await userEvent.clear(getByTestId('app-configure-name'));
		await userEvent.type(getByTestId('app-configure-name'), '  Sales  ');
		await userEvent.tab();

		await waitFor(() => expect(emitted('updated')).toEqual([[app('Sales')]]));
		expect(updateApp).toHaveBeenCalledOnce();
		expect(updateApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', {
			name: 'Sales',
		});
	});

	it('saves the namespace once on Enter', async () => {
		providePermissions(['app:update']);
		vi.mocked(updateApp).mockResolvedValue(app('Expense tracker', { namespace: 'costs' }));
		const { getByTestId } = renderComponent();

		await userEvent.clear(getByTestId('app-configure-namespace'));
		await userEvent.type(getByTestId('app-configure-namespace'), 'costs{Enter}');

		await waitFor(() =>
			expect(updateApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', {
				namespace: 'costs',
			}),
		);
		expect(updateApp).toHaveBeenCalledOnce();
		expect(confirm).not.toHaveBeenCalled();
	});

	it('does not save an unchanged value', async () => {
		providePermissions(['app:update']);
		const { getByTestId } = renderComponent();

		await userEvent.type(getByTestId('app-configure-name'), '  ');
		await userEvent.tab();

		expect(updateApp).not.toHaveBeenCalled();
		expect(getByTestId('app-configure-name')).toHaveValue('Expense tracker');
	});

	it('resets the value on Escape', async () => {
		providePermissions(['app:update']);
		const { getByTestId } = renderComponent();

		await userEvent.type(getByTestId('app-configure-name'), ' 2{Escape}');

		expect(getByTestId('app-configure-name')).toHaveValue('Expense tracker');
		expect(updateApp).not.toHaveBeenCalled();
	});

	it('keeps an invalid namespace with its error on blur', async () => {
		providePermissions(['app:update']);
		const { getByTestId, queryByTestId } = renderComponent();
		expect(queryByTestId('app-configure-namespace-error')).not.toBeInTheDocument();

		await userEvent.type(getByTestId('app-configure-namespace'), '--Bad');
		await userEvent.tab();

		expect(updateApp).not.toHaveBeenCalled();
		expect(getByTestId('app-configure-namespace')).toHaveValue('expenses--Bad');
		expect(getByTestId('app-configure-namespace-error')).toBeInTheDocument();
	});

	it('shows an error for an empty name and does not save it', async () => {
		providePermissions(['app:update']);
		const { getByTestId } = renderComponent();

		await userEvent.clear(getByTestId('app-configure-name'));
		await userEvent.tab();

		expect(updateApp).not.toHaveBeenCalled();
		expect(getByTestId('app-configure-name-error')).toHaveTextContent('Enter an app name.');
	});

	it('saves the second field only after the first save ends', async () => {
		providePermissions(['app:update']);
		let finishFirst: (value: AppResponse) => void = () => {};
		vi.mocked(updateApp)
			.mockImplementationOnce(async () => await new Promise((resolve) => (finishFirst = resolve)))
			.mockResolvedValueOnce(app('Sales', { namespace: 'sales' }));
		const { getByTestId, emitted } = renderComponent();

		await userEvent.clear(getByTestId('app-configure-name'));
		await userEvent.type(getByTestId('app-configure-name'), 'Sales');
		await userEvent.click(getByTestId('app-configure-namespace'));
		await userEvent.clear(getByTestId('app-configure-namespace'));
		await userEvent.type(getByTestId('app-configure-namespace'), 'sales');
		await userEvent.tab();
		expect(updateApp).toHaveBeenCalledOnce();

		finishFirst(app('Sales'));

		await waitFor(() => expect(updateApp).toHaveBeenCalledTimes(2));
		await waitFor(() =>
			expect(emitted('updated')).toEqual([[app('Sales')], [app('Sales', { namespace: 'sales' })]]),
		);
	});

	it('keeps an edit in one field when the other field is saved', async () => {
		providePermissions(['app:update']);
		const { getByTestId, rerender } = renderComponent();

		await userEvent.type(getByTestId('app-configure-namespace'), '-new');
		await rerender({ app: app('Renamed by the assistant') });

		expect(getByTestId('app-configure-name')).toHaveValue('Renamed by the assistant');
		expect(getByTestId('app-configure-namespace')).toHaveValue('expenses-new');
	});

	it.each([
		['confirm', 1, 'expenses-new'],
		['cancel', 0, 'expenses'],
	])(
		'asks before the namespace of a published app changes (%s)',
		async (answer, requests, value) => {
			providePermissions(['app:update']);
			confirm.mockResolvedValue(answer);
			vi.mocked(updateApp).mockResolvedValue(app());
			const published = app('Expense tracker', {
				publishedVersionId: 'v1',
				publishedUrl: 'https://expenses.apps.example.com',
			});
			const { getByTestId } = renderComponent({ props: { app: published } });

			await userEvent.type(getByTestId('app-configure-namespace'), '-new');
			await userEvent.tab();

			await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
			await waitFor(() => expect(updateApp).toHaveBeenCalledTimes(requests));
			expect(getByTestId('app-configure-namespace')).toHaveValue(value);
		},
	);

	it.each<[string, Scope[], boolean]>([
		['without the update scope', ['app:read'], false],
		['in a read-only instance', ['app:update'], true],
	])('shows the fields as read-only %s', (_case, scopes, readOnly) => {
		providePermissions(scopes, readOnly);
		const { getByTestId } = renderComponent();

		expect(getByTestId('app-configure-name')).toBeDisabled();
		expect(getByTestId('app-configure-namespace')).toBeDisabled();
	});

	it('keeps the value and shows an error toast when the save fails', async () => {
		providePermissions(['app:update']);
		vi.mocked(updateApp).mockRejectedValue(new Error('taken'));
		const { getByTestId, emitted } = renderComponent();

		await userEvent.type(getByTestId('app-configure-namespace'), '-2');
		await userEvent.tab();

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Could not save the app settings'),
		);
		expect(getByTestId('app-configure-namespace')).toHaveValue('expenses-2');
		expect(emitted('updated')).toBeUndefined();
	});
});
