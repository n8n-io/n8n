import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { deleteApp } from '../apps.api';
import AppCard from './AppCard.vue';

vi.mock('../apps.api');

const { confirm, showError } = vi.hoisted(() => ({ confirm: vi.fn(), showError: vi.fn() }));
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	useMessage: () => ({ confirm }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const app: AppResponse = {
	id: 'app-1',
	projectId: 'project-1',
	name: 'Expense tracker',
	namespace: 'expenses',
	visibility: 'project',
	draftVersionId: null,
	publishedVersionId: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
};

const renderComponent = createComponentRenderer(AppCard, {
	global: {
		stubs: {
			N8nActionToggle: {
				template:
					'<div><button v-for="a in actions" :key="a.value" :data-action="a.value" @click="$emit(\'action\', a.value)">{{ a.label }}</button></div>',
				props: ['actions'],
				emits: ['action'],
			},
		},
	},
});

function providePermissions(scopes: Scope[], readOnly = false) {
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => readOnly,
	});
}

describe('AppCard', () => {
	afterEach(() => {
		capabilityRegistry.clear();
		vi.clearAllMocks();
	});

	it('shows the app name, namespace, visibility and draft state', () => {
		providePermissions([]);
		const { getByText, getByTestId } = renderComponent({ props: { app } });

		expect(getByTestId('app-card-name')).toHaveTextContent('Expense tracker');
		expect(getByText('expenses')).toBeInTheDocument();
		expect(getByText('Project members')).toBeInTheDocument();
		expect(getByTestId('app-card-publication')).toHaveTextContent('Draft');
	});

	it('shows the published state when the app has a published version', () => {
		providePermissions([]);
		const { getByTestId } = renderComponent({
			props: { app: { ...app, publishedVersionId: 'version-1' } },
		});

		expect(getByTestId('app-card-publication')).toHaveTextContent('Published');
	});

	it.each<[string, Scope[], boolean]>([
		['without the delete scope', ['app:read'], false],
		['in a read-only instance', ['app:delete'], true],
	])('hides the delete action %s', (_case, scopes, readOnly) => {
		providePermissions(scopes, readOnly);
		const { queryByRole } = renderComponent({ props: { app } });

		expect(queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
	});

	it('deletes the app after confirmation and emits deleted', async () => {
		providePermissions(['app:delete']);
		confirm.mockResolvedValue('confirm');
		const { getByRole, emitted } = renderComponent({ props: { app } });

		await userEvent.click(getByRole('button', { name: 'Delete' }));

		await waitFor(() => expect(emitted('deleted')).toEqual([['app-1']]));
		expect(deleteApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1');
	});

	it('keeps the app when the user cancels', async () => {
		providePermissions(['app:delete']);
		confirm.mockResolvedValue('cancel');
		const { getByRole, emitted } = renderComponent({ props: { app } });

		await userEvent.click(getByRole('button', { name: 'Delete' }));

		await waitFor(() => expect(confirm).toHaveBeenCalled());
		expect(deleteApp).not.toHaveBeenCalled();
		expect(emitted('deleted')).toBeUndefined();
	});

	it('shows an error and keeps the app when the delete fails', async () => {
		providePermissions(['app:delete']);
		confirm.mockResolvedValue('confirm');
		vi.mocked(deleteApp).mockRejectedValue(new Error('Conflict'));
		const { getByRole, emitted } = renderComponent({ props: { app } });

		await userEvent.click(getByRole('button', { name: 'Delete' }));

		await waitFor(() => expect(showError).toHaveBeenCalled());
		expect(emitted('deleted')).toBeUndefined();
	});
});
