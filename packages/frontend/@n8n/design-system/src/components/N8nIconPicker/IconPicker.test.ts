import { fireEvent, render, waitFor } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';

import IconPicker from '.';
import { ALL_ICON_PICKER_ICONS } from './constants';

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
};

/**
 * Helper to get the actual tab element from a tab container.
 * N8nTabs wraps each tab in N8nTooltip which adds a trigger span wrapper.
 */
function getTabElement(tabContainer: Element): Element | null {
	// Find the element with activeTab class, or the clickable tab div
	return (
		tabContainer.querySelector('[class*="activeTab"]') ??
		tabContainer.querySelector('[class*="tab"]')
	);
}

describe('IconPicker', () => {
	it('renders icons and emojis', async () => {
		const { getByTestId, getAllByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: 'smile' },
				buttonTooltip: 'Select an icon',
			},
			global: {
				plugins: [router],
				components,
				stubs: ['N8nButton', 'N8nIcon'],
			},
		});
		const TEST_EMOJI_COUNT = 1962;

		await fireEvent.click(getByTestId('icon-picker-button'));
		// Tabs should be visible and icons should be selected by default
		expect(getByTestId('icon-picker-tabs')).toBeVisible();
		const tabIconsContainer = getByTestId('tab-icons');
		const tabIconsElement = getTabElement(tabIconsContainer);
		expect(tabIconsElement?.className).toContain('activeTab');
		expect(getByTestId('icon-picker-popup')).toBeVisible();
		// All icons should be rendered
		expect(getAllByTestId('icon-picker-icon')).toHaveLength(ALL_ICON_PICKER_ICONS.length);

		// Click on emojis tab - click on the actual tab element
		const emojiTabContainer = getByTestId('tab-emojis');
		const emojiTabElement = getTabElement(emojiTabContainer);
		await fireEvent.click(emojiTabElement ?? emojiTabContainer);
		// Emojis tab should be active - need to re-query to get updated class
		await waitFor(() => {
			const updatedEmojiTab = getTabElement(getByTestId('tab-emojis'));
			expect(updatedEmojiTab?.className).toContain('activeTab');
		});
		// All emojis should be rendered
		expect(getAllByTestId('icon-picker-emoji')).toHaveLength(TEST_EMOJI_COUNT);
	});

	it('renders icon picker with custom icon and tooltip', async () => {
		const ICON = 'layers';
		const TOOLTIP = 'Select something...';
		const { getByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: ICON },
				buttonTooltip: TOOLTIP,
			},
			global: {
				plugins: [router],
				components,
				stubs: ['N8nButton'],
			},
		});
		// Verify icon is rendered with correct icon prop
		expect(getByTestId('icon-picker-button')).toHaveAttribute('icon', ICON);
	});

	it('renders emoji as default icon correctly', async () => {
		const EMOJI = '🔥';
		const TOOLTIP = 'Select something...';
		const { getByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'emoji', value: EMOJI },
				buttonTooltip: TOOLTIP,
			},
			global: {
				plugins: [router],
				components,
			},
		});
		// Verify emoji is rendered as button content
		expect(getByTestId('icon-picker-button')).toHaveTextContent(EMOJI);
	});

	it('renders icon picker with only emojis', () => {
		const { queryByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: 'smile' },
				buttonTooltip: 'Select an emoji',
			},
			global: {
				plugins: [router],
				components,
				stubs: ['N8nButton'],
			},
		});
		expect(queryByTestId('tab-icons')).not.toBeInTheDocument();
	});

	it('is able to select an icon', async () => {
		const { getByTestId, getAllByTestId, queryByTestId, emitted } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: 'smile' },
				buttonTooltip: 'Select an icon',
			},
			global: {
				plugins: [router],
				components,
				stubs: ['N8nIcon', 'N8nButton'],
			},
		});
		await fireEvent.click(getByTestId('icon-picker-button'));
		// Select the first icon
		await fireEvent.click(getAllByTestId('icon-picker-icon')[0]);
		// Icon should be selected and popup should be closed
		expect(getByTestId('icon-picker-button')).toHaveAttribute('icon', ALL_ICON_PICKER_ICONS[0]);
		expect(queryByTestId('icon-picker-popup')).toBeNull();
		expect(emitted()).toHaveProperty('update:modelValue');
		// Should emit the selected icon
		expect((emitted()['update:modelValue'] as unknown[][])[0][0]).toEqual({
			type: 'icon',
			value: ALL_ICON_PICKER_ICONS[0],
		});
	});

	it('is able to select an emoji', async () => {
		const { getByTestId, getAllByTestId, queryByTestId, emitted } = render(IconPicker, {
			props: {
				modelValue: { type: 'emoji', value: '🔥' },
				buttonTooltip: 'Select an emoji',
			},
			global: {
				plugins: [router],
				components,
				stubs: ['N8nIcon'],
			},
		});
		await fireEvent.click(getByTestId('icon-picker-button'));
		// Click on the actual tab element, not the wrapper
		const emojiTabContainer = getByTestId('tab-emojis');
		const emojiTabElement = getTabElement(emojiTabContainer);
		await fireEvent.click(emojiTabElement ?? emojiTabContainer);
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
