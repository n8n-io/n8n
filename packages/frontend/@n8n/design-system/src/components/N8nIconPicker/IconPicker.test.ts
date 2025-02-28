import userEvent from '@testing-library/user-event';
import { fireEvent, render } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';

import IconPicker from '.';
import { TEST_ICONS } from './constants';

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
	it('renders icons and emojis', async () => {
		const { getByTestId, getAllByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: 'smile' },
				buttonTooltip: 'Select an icon',
				availableIcons: TEST_ICONS,
			},
			global: {
				plugins: [router],
				components,
			},
		});
		const TEST_EMOJI_COUNT = 1962;

		await fireEvent.click(getByTestId('icon-picker-button'));
		// Tabs should be visible and icons should be selected by default
		expect(getByTestId('icon-picker-tabs')).toBeVisible();
		expect(getByTestId('tab-icons').className).toContain('activeTab');
		expect(getByTestId('icon-picker-popup')).toBeVisible();
		// All icons should be rendered
		expect(getAllByTestId('icon-picker-icon')).toHaveLength(TEST_ICONS.length);
		// Click on emojis tab
		await fireEvent.click(getByTestId('tab-emojis'));
		// Emojis tab should be active
		expect(getByTestId('tab-emojis').className).toContain('activeTab');
		// All emojis should be rendered
		expect(getAllByTestId('icon-picker-emoji')).toHaveLength(TEST_EMOJI_COUNT);
	});
	it('renders icon picker with custom icon and tooltip', async () => {
		const ICON = 'layer-group';
		const TOOLTIP = 'Select something...';
		const { getByTestId, getByRole } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: ICON },
				availableIcons: [...TEST_ICONS],
				buttonTooltip: TOOLTIP,
			},
			global: {
				plugins: [router],
				components,
			},
		});
		await userEvent.hover(getByTestId('icon-picker-button'));
		expect(getByRole('tooltip').textContent).toBe(TOOLTIP);
		expect(getByTestId('icon-picker-button').dataset.icon).toBe(ICON);
	});
	it('renders emoji as default icon correctly', async () => {
		const ICON = '🔥';
		const TOOLTIP = 'Select something...';
		const { getByTestId, getByRole } = render(IconPicker, {
			props: {
				modelValue: { type: 'emoji', value: ICON },
				availableIcons: [...TEST_ICONS],
				buttonTooltip: TOOLTIP,
			},
			global: {
				plugins: [router],
				components,
			},
		});
		await userEvent.hover(getByTestId('icon-picker-button'));
		expect(getByRole('tooltip').textContent).toBe(TOOLTIP);
		expect(getByTestId('icon-picker-button')).toHaveTextContent(ICON);
	});
	it('renders icon picker with only emojis', () => {
		const { queryByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: 'smile' },
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
	it('is able to select an icon', async () => {
		const { getByTestId, getAllByTestId, queryByTestId, emitted } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: 'smile' },
				buttonTooltip: 'Select an icon',
				availableIcons: TEST_ICONS,
			},
			global: {
				plugins: [router],
				components,
			},
		});
		await fireEvent.click(getByTestId('icon-picker-button'));
		// Select the first icon
		await fireEvent.click(getAllByTestId('icon-picker-icon')[0]);
		// Icon should be selected and popup should be closed
		expect(getByTestId('icon-picker-button').dataset.icon).toBe(TEST_ICONS[0]);
		expect(queryByTestId('icon-picker-popup')).toBeNull();
		expect(emitted()).toHaveProperty('update:modelValue');
		// Should emit the selected icon
		expect((emitted()['update:modelValue'] as unknown[][])[0][0]).toEqual({
			type: 'icon',
			value: TEST_ICONS[0],
		});
	});
	it('is able to select an emoji', async () => {
		const { getByTestId, getAllByTestId, queryByTestId, emitted } = render(IconPicker, {
			props: {
				modelValue: { type: 'emoji', value: '🔥' },
				buttonTooltip: 'Select an emoji',
				availableIcons: TEST_ICONS,
			},
			global: {
				plugins: [router],
				components,
			},
		});
		await fireEvent.click(getByTestId('icon-picker-button'));
		await fireEvent.click(getByTestId('tab-emojis'));
		expect(getByTestId('icon-picker-popup')).toBeVisible();
		// Select the first emoji
		await fireEvent.click(getAllByTestId('icon-picker-emoji')[0]);
		// Emoji should be selected and popup should be closed
		expect(getByTestId('icon-picker-button')).toHaveTextContent('😀');
		expect(queryByTestId('icon-picker-popup')).toBeNull();
		// Should emit the selected emoji
		expect(emitted()).toHaveProperty('update:modelValue');
		expect((emitted()['update:modelValue'] as unknown[][])[0][0]).toEqual({
			type: 'emoji',
			value: '😀',
		});
	});
});
