import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { deleteApp } from '../apps.api';
import AppActions from './AppActions.vue';

vi.mock('../apps.api');

const { confirm, showError, showMessage, track } = vi.hoisted(() => ({
	confirm: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
	track: vi.fn(),
}));
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	useMessage: () => ({ confirm }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError, showMessage }) }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

const app: AppResponse = {
	id: 'app-1',
	projectId: 'project-1',
	name: 'Expense tracker',
	namespace: 'expenses',
	visibility: 'project',
	draftVersionId: null,
	publishedVersionId: null,
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
};

const renderComponent = createComponentRenderer(AppActions, {
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

describe('AppActions', () => {
	afterEach(() => {
		capabilityRegistry.clear();
		vi.clearAllMocks();
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

	it('treats an app that no longer exists as deleted', async () => {
		providePermissions(['app:delete']);
		confirm.mockResolvedValue('confirm');
		vi.mocked(deleteApp).mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
		const { getByRole, emitted } = renderComponent({ props: { app } });

		await userEvent.click(getByRole('button', { name: 'Delete' }));

		await waitFor(() => expect(emitted('deleted')).toEqual([['app-1']]));
		expect(showError).not.toHaveBeenCalled();
	});

	describe('show code', () => {
		it('is hidden unless the menu asks for it', () => {
			providePermissions(['app:delete']);
			const { queryByRole } = renderComponent({ props: { app } });

			expect(queryByRole('button', { name: 'Show code' })).not.toBeInTheDocument();
		});

		it('shows the menu with only show code for a user who cannot delete', () => {
			providePermissions(['app:read']);
			const { getByRole, queryByRole } = renderComponent({ props: { app, showCode: true } });

			expect(getByRole('button', { name: 'Show code' })).toBeInTheDocument();
			expect(queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
		});

		it('tracks the click once and shows a coming-soon message', async () => {
			providePermissions(['app:read']);
			const { getByRole } = renderComponent({ props: { app, showCode: true } });

			await userEvent.click(getByRole('button', { name: 'Show code' }));

			expect(track).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.APPS.USER_CLICKED_SHOW_APP_CODE,
				{ app_id: 'app-1', project_id: 'project-1' },
			);
			expect(showMessage).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ type: 'info', title: 'Code view is coming soon' }),
			);
			expect(confirm).not.toHaveBeenCalled();
		});
	});
});
