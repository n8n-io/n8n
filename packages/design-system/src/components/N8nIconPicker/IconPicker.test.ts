import { fireEvent, render } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';

import IconPicker from '.';
import { allIcons } from './constants';

// Create a proxy handler that returns a mock icon object for any icon name
// and mock the entire icon library with the proxy
vi.mock(
	'@fortawesome/free-solid-svg-icons',
	() =>
		new Proxy(
			{},
			{
				get: (_target, prop) => {
					return { prefix: 'fas', iconName: prop.toString().replace('fa', '').toLowerCase() };
				},
			},
		),
);

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/icons',
			name: 'icons',
			redirect: '/icons',
		},
		{
			path: '/emojis',
			name: 'emojis',
			component: { template: '<h1>emojis</h1>' },
		},
	],
});

// Component stubs
const components = {
	N8nIconButton: {
		template: '<button :data-icon="icon" data-testid="icon-picker-button" />',
		props: ['icon'],
	},
	N8nIcon: {
		template:
			'<div class="mock-icon" :data-icon="typeof icon === \'string\' ? icon : icon.iconName" />',
		props: ['icon'],
	},
};

describe('IconPicker', () => {
	it('renders default icon picker and switches tabs', async () => {
		const { getByTestId } = render(IconPicker, {
			props: {
				defaultIcon: 'smile',
				buttonTooltip: 'Select an icon',
				availableIcons: allIcons,
			},
			global: {
				plugins: [router],
				components,
			},
		});
		await fireEvent.click(getByTestId('icon-picker-button'));
		// Tabs should be visible and icons should be selected by default
		expect(getByTestId('icon-picker-tabs')).toBeVisible();
		expect(getByTestId('tab-icons').className).toContain('activeTab');
		// Click on emojis tab
		await fireEvent.click(getByTestId('tab-emojis'));
		// Emojis tab should be active
		expect(getByTestId('tab-emojis').className).toContain('activeTab');
	});
	it('renders icon picker with custom icon and tooltip', () => {
		const { getByTestId } = render(IconPicker, {
			props: {
				defaultIcon: 'layer-group',
				availableIcons: [...allIcons],
				buttonTooltip: 'Select something...',
			},
			global: {
				plugins: [router],
				components,
			},
		});
		expect(getByTestId('icon-picker-button').title).toBe('Select something...');
		expect(getByTestId('icon-picker-button').dataset.icon).toBe('layer-group');
	});
	it('renders icon picker with only emojis', () => {
		const { queryByTestId } = render(IconPicker, {
			props: {
				defaultIcon: 'smile',
				buttonTooltip: 'Select an emoji',
				availableIcons: [],
			},
			global: {
				plugins: [router],
				components,
			},
		});
		expect(queryByTestId('tab-icons')).not.toBeInTheDocument();
	});
});
