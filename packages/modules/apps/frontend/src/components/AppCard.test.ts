import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import AppCard from './AppCard.vue';

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
			AppActions: {
				props: ['app'],
				emits: ['deleted'],
				template:
					'<button data-test-id="app-actions" @click="$emit(\'deleted\', app.id)">Delete</button>',
			},
		},
	},
});

describe('AppCard', () => {
	it('shows the app name, namespace, visibility and draft state', () => {
		const { getByText, getByTestId } = renderComponent({ props: { app } });

		expect(getByTestId('app-card-name')).toHaveTextContent('Expense tracker');
		expect(getByText('expenses')).toBeInTheDocument();
		expect(getByText('Project members')).toBeInTheDocument();
		expect(getByTestId('app-card-publication')).toHaveTextContent('Draft');
	});

	it('shows the published state when the app has a published version', () => {
		const { getByTestId } = renderComponent({
			props: { app: { ...app, publishedVersionId: 'version-1' } },
		});

		expect(getByTestId('app-card-publication')).toHaveTextContent('Published');
	});

	it('emits select when the user clicks the card', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { app } });

		await userEvent.click(getByTestId('app-card-name'));

		expect(emitted('select')).toEqual([[app]]);
	});

	it.each(['{Enter}', ' '])('emits select when the user presses %s on the card', async (key) => {
		const { getByTestId, emitted } = renderComponent({ props: { app } });

		getByTestId('app-card').focus();
		await userEvent.keyboard(key);

		expect(emitted('select')).toEqual([[app]]);
	});

	it('passes a delete on and does not select the app', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { app } });

		await userEvent.click(getByTestId('app-actions'));

		expect(emitted('deleted')).toEqual([['app-1']]);
		expect(emitted('select')).toBeUndefined();
	});
});
