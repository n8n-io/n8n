import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import type { AppVersions } from '../../composables/useAppVersions';
import AppConfigure from './AppConfigure.vue';
import type { AppConfigureTab } from './appConfigureTabs';

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
	props: { app, versions: {} as AppVersions, tab: 'basics' },
	global: {
		stubs: {
			AppConfigureTabBasics: {
				props: ['app', 'versions'],
				emits: ['updated'],
				template:
					'<button data-test-id="basics-tab" @click="$emit(\'updated\', { ...app, name: \'Renamed\' })">{{ app.name }}</button>',
			},
		},
	},
});

describe('AppConfigure', () => {
	it('shows the sub-tabs and the active tab with the app', () => {
		const { getByTestId, getByText } = renderComponent();

		expect(getByText('Basics')).toBeInTheDocument();
		expect(getByTestId('basics-tab')).toHaveTextContent('Expense tracker');
	});

	it('passes an update of the tab on', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('basics-tab'));

		expect(emitted('updated')).toEqual([[{ ...app, name: 'Renamed' }]]);
	});

	it('emits the selected sub-tab', async () => {
		const { getByText, emitted } = renderComponent({
			props: { tab: 'previous' as AppConfigureTab },
		});

		await userEvent.click(getByText('Basics'));

		expect(emitted('update:tab')).toEqual([['basics']]);
	});
});
