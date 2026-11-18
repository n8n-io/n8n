import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsLayout from './SettingsLayout.vue';
import { describe, it, expect } from 'vitest';

const renderComponent = createComponentRenderer(SettingsLayout, {
	pinia: createTestingPinia(),
	global: {
		stubs: {
			AppNavigation: { template: '<nav data-test-id="app-navigation" />' },
			RouterView: { template: '<div>Settings Content</div>' },
		},
	},
});

describe('SettingsLayout', () => {
	it('shows the app navigation in the sidebar, which lists the settings pages', () => {
		const { getByTestId, container } = renderComponent();

		expect(container.querySelector('aside#sidebar')).toContainElement(
			getByTestId('app-navigation'),
		);
	});

	it('shows the settings page in the content area, with no header', () => {
		const { getByText, container } = renderComponent();

		expect(container.querySelector('main#content')).toContainElement(getByText('Settings Content'));
		expect(container.querySelector('header#header')).not.toBeInTheDocument();
	});
});
