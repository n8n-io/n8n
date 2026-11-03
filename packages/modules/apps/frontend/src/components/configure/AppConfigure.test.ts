import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import AppConfigure from './AppConfigure.vue';

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

const renderComponent = createComponentRenderer(AppConfigure, {
	props: { app },
	global: {
		stubs: {
			AppConfigureGeneral: {
				props: ['app'],
				emits: ['updated'],
				template:
					'<button data-test-id="general" @click="$emit(\'updated\', { ...app, name: \'Renamed\' })">{{ app.name }}</button>',
			},
		},
	},
});

describe('AppConfigure', () => {
	it('shows the general card with the app', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('general')).toHaveTextContent('Expense tracker');
	});

	it('passes an update of a card on', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('general'));

		expect(emitted('updated')).toEqual([[{ ...app, name: 'Renamed' }]]);
	});
});
