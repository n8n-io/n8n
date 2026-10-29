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
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
};

const navigate = vi.fn();

const renderComponent = createComponentRenderer(AppCard, {
	global: {
		stubs: {
			RouterLink: {
				props: ['to'],
				setup: () => ({ navigate }),
				template:
					'<a :href="\'/projects/\' + to.params.projectId + \'/apps/\' + to.params.appId" data-test-id="app-card-link" @click.prevent="navigate"><slot /></a>',
			},
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

	it('links to the detail page of the app', () => {
		const { getByTestId } = renderComponent({ props: { app } });

		expect(getByTestId('app-card-link')).toHaveAttribute('href', '/projects/project-1/apps/app-1');
	});

	it('passes a delete on and does not open the app', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { app } });

		await userEvent.click(getByTestId('app-actions'));

		expect(emitted('deleted')).toEqual([['app-1']]);
		expect(navigate).not.toHaveBeenCalled();
	});
});
