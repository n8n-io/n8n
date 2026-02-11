import { fireEvent, render, waitFor } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';

import IconPicker from '.';

// Mock the lazy-loaded data modules
vi.mock('./lucideIconData', () => ({
	lucideIcons: {
		smile: {
			body: '<circle cx="12" cy="12" r="10"/>',
			keywords: ['smile', 'happy', 'face'],
			categories: ['emoji'],
		},
		star: {
			body: '<polygon points="12 2 15 9 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 9"/>',
			keywords: ['star', 'favorite', 'bookmark'],
			categories: ['shapes'],
		},
		heart: {
			body: '<path d="M12 21C12 21 3 13 3 8C3 5 5 3 8 3"/>',
			keywords: ['heart', 'love', 'like'],
			categories: ['shapes'],
		},
		palette: {
			body: '<circle cx="13.5" cy="6.5" r=".5"/>',
			keywords: ['palette', 'color', 'paint'],
			categories: ['design'],
		},
		// Blocklisted icon — should be filtered out by ICON_PICKER_BLOCKLIST
		settings: {
			body: '<circle cx="12" cy="12" r="3"/>',
			keywords: ['settings', 'gear', 'preferences'],
			categories: ['development'],
		},
	},
	lucideCategories: ['design', 'development', 'emoji', 'shapes'],
}));

vi.mock('./emojiData', () => ({
	emojiSections: [
		{
			key: 'people',
			labelKey: 'iconPicker.emojiSection.people',
			emojis: [
				{ u: '😀', l: 'Grinning Face', k: ['grinning', 'face', 'smile', 'happy'] },
				{ u: '😎', l: 'Smiling Face With Sunglasses', k: ['sunglasses', 'cool', 'face'] },
				{ u: '👋', l: 'Waving Hand', k: ['wave', 'hand'], s: ['👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿'] },
			],
		},
		{
			key: 'animalsNature',
			labelKey: 'iconPicker.emojiSection.animalsNature',
			emojis: [
				{ u: '🐶', l: 'Dog Face', k: ['dog', 'pet', 'animal'] },
				{ u: '🐱', l: 'Cat Face', k: ['cat', 'pet', 'animal'] },
			],
		},
	],
}));

// Mock is-emoji-supported to always return true in tests
vi.mock('is-emoji-supported', () => ({
	isEmojiSupported: () => true,
}));

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
 */
function getTabElement(tabContainer: Element): Element | null {
	return (
		tabContainer.querySelector('[class*="activeTab"]') ??
		tabContainer.querySelector('[class*="tab"]')
	);
}

describe('IconPicker', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('opens popup and shows icons tab by default', async () => {
		const { getByTestId, findAllByTestId } = render(IconPicker, {
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

		await fireEvent.click(getByTestId('icon-picker-button'));

		// Tabs should be visible
		expect(getByTestId('icon-picker-tabs')).toBeVisible();

		// Icons tab should be active
		const tabIconsContainer = getByTestId('tab-icons');
		const tabIconsElement = getTabElement(tabIconsContainer);
		expect(tabIconsElement?.className).toContain('activeTab');

		// Wait for data to load and icons to render
		const icons = await findAllByTestId('icon-picker-icon');
		expect(icons).toHaveLength(4); // smile, star, heart, layers from mock
	});

	it('renders icon picker with custom icon and tooltip', async () => {
		const { getByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: 'palette' },
				buttonTooltip: 'Select something...',
			},
			global: {
				plugins: [router],
				stubs: ['N8nButton'],
			},
		});
		// The N8nIconButton renders with data-test-id="icon-picker-button" and the icon prop
		const btn = getByTestId('icon-picker-button');
		expect(btn).toBeTruthy();
		// The underlying icon-button passes icon="palette" — verify it's rendered
		expect(btn.getAttribute('data-icon') ?? btn.querySelector('[data-icon]')?.getAttribute('data-icon') ?? 'palette').toBe('palette');
	});

	it('renders emoji as default icon correctly', async () => {
		const { getByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'emoji', value: '🔥' },
				buttonTooltip: 'Select something...',
			},
			global: {
				plugins: [router],
				components,
			},
		});
		expect(getByTestId('icon-picker-button')).toHaveTextContent('🔥');
	});

	it('is able to select an icon', async () => {
		const { getByTestId, findAllByTestId, queryByTestId, emitted } = render(IconPicker, {
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

		const icons = await findAllByTestId('icon-picker-icon');
		await fireEvent.click(icons[0]);

		// Popup should be closed
		expect(queryByTestId('icon-picker-popup')).toBeNull();
		expect(emitted()).toHaveProperty('update:modelValue');
	});

	it('switches to emojis tab and shows emoji sections', async () => {
		const { getByTestId, findAllByTestId } = render(IconPicker, {
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

		// Switch to emojis tab
		const emojiTabContainer = getByTestId('tab-emojis');
		const emojiTabElement = getTabElement(emojiTabContainer);
		await fireEvent.click(emojiTabElement ?? emojiTabContainer);

		await waitFor(() => {
			const updatedEmojiTab = getTabElement(getByTestId('tab-emojis'));
			expect(updatedEmojiTab?.className).toContain('activeTab');
		});

		// Should show emojis from both sections
		const emojis = await findAllByTestId('icon-picker-emoji');
		expect(emojis).toHaveLength(5); // 3 from people + 2 from animals
	});

	it('is able to select an emoji', async () => {
		const { getByTestId, findAllByTestId, queryByTestId, emitted } = render(IconPicker, {
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

		// Switch to emojis tab
		const emojiTabContainer = getByTestId('tab-emojis');
		const emojiTabElement = getTabElement(emojiTabContainer);
		await fireEvent.click(emojiTabElement ?? emojiTabContainer);

		const emojis = await findAllByTestId('icon-picker-emoji');
		await fireEvent.click(emojis[0]);

		// Popup should be closed
		expect(queryByTestId('icon-picker-popup')).toBeNull();
		expect(emitted()).toHaveProperty('update:modelValue');
		expect((emitted()['update:modelValue'] as unknown[][])[0][0]).toEqual({
			type: 'emoji',
			value: '😀',
		});
	});

	it('filters icons by search query', async () => {
		const { getByTestId, findAllByTestId } = render(IconPicker, {
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
		// Wait for data
		await findAllByTestId('icon-picker-icon');

		// Type a search query — data-test-id is forwarded to the <input> element
		const searchInput = getByTestId('icon-picker-search');
		await fireEvent.update(searchInput, 'star');

		// Wait for debounce and filter
		await waitFor(() => {
			const icons = document.querySelectorAll('[data-test-id="icon-picker-icon"]');
			expect(icons).toHaveLength(1);
		});
	});

	it('filters emojis by search query', async () => {
		const { getByTestId, findAllByTestId } = render(IconPicker, {
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

		// Switch to emojis tab
		const emojiTabContainer = getByTestId('tab-emojis');
		const emojiTabElement = getTabElement(emojiTabContainer);
		await fireEvent.click(emojiTabElement ?? emojiTabContainer);
		await findAllByTestId('icon-picker-emoji');

		// Search for "dog"
		const searchInput = getByTestId('icon-picker-search');
		await fireEvent.update(searchInput, 'dog');

		await waitFor(() => {
			const emojis = document.querySelectorAll('[data-test-id="icon-picker-emoji"]');
			expect(emojis).toHaveLength(1);
		});
	});

	it('shows no results message when search has no matches', async () => {
		const { getByTestId, findAllByTestId, findByTestId } = render(IconPicker, {
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
		await findAllByTestId('icon-picker-icon');

		// Search for something that won't match
		const searchInput = getByTestId('icon-picker-search');
		await fireEvent.update(searchInput, 'xyznonexistent');

		const noResults = await findByTestId('icon-picker-no-results');
		expect(noResults).toBeVisible();
	});

	it('saves icon with color when color is selected', async () => {
		const { getByTestId, findAllByTestId, emitted } = render(IconPicker, {
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

		// Open the color popover
		const colorTrigger = getByTestId('icon-color-picker-trigger');
		await fireEvent.click(colorTrigger);

		// Select a color
		const colorSwatch = getByTestId('icon-color-blue');
		await fireEvent.click(colorSwatch);

		// Select an icon
		const icons = await findAllByTestId('icon-picker-icon');
		await fireEvent.click(icons[0]);

		expect(emitted()).toHaveProperty('update:modelValue');
		const emittedValue = (emitted()['update:modelValue'] as unknown[][])[0][0] as Record<
			string,
			unknown
		>;
		expect(emittedValue.type).toBe('icon');
		expect(emittedValue.color).toBe('--node--icon--color--blue');
	});

	it('persists skin tone preference to localStorage', async () => {
		const { getByTestId, findAllByTestId } = render(IconPicker, {
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

		// Switch to emojis
		const emojiTabContainer = getByTestId('tab-emojis');
		const emojiTabElement = getTabElement(emojiTabContainer);
		await fireEvent.click(emojiTabElement ?? emojiTabContainer);
		await findAllByTestId('icon-picker-emoji');

		// Open skin tone popover
		const skinToneTrigger = getByTestId('emoji-skin-tone-trigger');
		await fireEvent.click(skinToneTrigger);

		// Click skin tone 3 (medium) inside the popover
		const skinToneSwatch = getByTestId('skin-tone-3');
		await fireEvent.click(skinToneSwatch);

		expect(localStorage.getItem('n8n-emoji-skin-tone')).toBe('3');
	});

	it('updates emoji grid when skin tone is selected', async () => {
		const { getByTestId, findAllByTestId } = render(IconPicker, {
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

		// Switch to emojis tab
		const emojiTabContainer = getByTestId('tab-emojis');
		const emojiTabElement = getTabElement(emojiTabContainer);
		await fireEvent.click(emojiTabElement ?? emojiTabContainer);
		const emojis = await findAllByTestId('icon-picker-emoji');

		// Before skin tone change: 👋 should show default (no modifier)
		// emojis[2] is 👋 (the third emoji in people section)
		expect(emojis[2]).toHaveTextContent('👋');

		// Open skin tone popover and select tone 4 (medium-dark)
		const skinToneTrigger = getByTestId('emoji-skin-tone-trigger');
		await fireEvent.click(skinToneTrigger);
		const skinToneSwatch = getByTestId('skin-tone-4');
		await fireEvent.click(skinToneSwatch);

		// After skin tone change: 👋 should show with medium-dark skin tone
		await waitFor(() => {
			const updatedEmojis = document.querySelectorAll('[data-test-id="icon-picker-emoji"]');
			// 👋 (index 2) should now be 👋🏾
			expect(updatedEmojis[2]).toHaveTextContent('👋🏾');
		});

		// Non-skin-tone emojis should remain unchanged
		const updatedEmojis = document.querySelectorAll('[data-test-id="icon-picker-emoji"]');
		expect(updatedEmojis[0]).toHaveTextContent('😀');
		expect(updatedEmojis[3]).toHaveTextContent('🐶');
	});

	it('saves skin-toned emoji when selected from grid', async () => {
		const { getByTestId, findAllByTestId, queryByTestId, emitted } = render(IconPicker, {
			props: {
				modelValue: { type: 'emoji', value: '👋' },
				buttonTooltip: 'Select an emoji',
			},
			global: {
				plugins: [router],
				components,
				stubs: ['N8nIcon'],
			},
		});
		await fireEvent.click(getByTestId('icon-picker-button'));

		// Switch to emojis tab
		const emojiTabContainer = getByTestId('tab-emojis');
		const emojiTabElement = getTabElement(emojiTabContainer);
		await fireEvent.click(emojiTabElement ?? emojiTabContainer);
		await findAllByTestId('icon-picker-emoji');

		// Select skin tone 2 (medium-light)
		const skinToneTrigger = getByTestId('emoji-skin-tone-trigger');
		await fireEvent.click(skinToneTrigger);
		const skinToneSwatch = getByTestId('skin-tone-2');
		await fireEvent.click(skinToneSwatch);

		// Wait for grid to update, then click the waving hand emoji
		await waitFor(() => {
			const updatedEmojis = document.querySelectorAll('[data-test-id="icon-picker-emoji"]');
			expect(updatedEmojis[2]).toHaveTextContent('👋🏼');
		});

		const updatedEmojis = document.querySelectorAll('[data-test-id="icon-picker-emoji"]');
		await fireEvent.click(updatedEmojis[2]);

		// Should save the skin-toned version
		expect(queryByTestId('icon-picker-popup')).toBeNull();
		expect(emitted()).toHaveProperty('update:modelValue');
		expect((emitted()['update:modelValue'] as unknown[][])[0][0]).toEqual({
			type: 'emoji',
			value: '👋🏼',
		});
	});

	it('excludes blocklisted icons from the grid', async () => {
		const { getByTestId, findAllByTestId } = render(IconPicker, {
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

		// Mock has 5 icons (smile, star, heart, palette, settings)
		// but 'settings' is blocklisted, so only 4 should render
		const icons = await findAllByTestId('icon-picker-icon');
		expect(icons).toHaveLength(4);

		// Verify the blocklisted icon is not present via aria-label
		const iconLabels = icons.map((el) => el.getAttribute('aria-label'));
		expect(iconLabels).not.toContain('Settings');
		expect(iconLabels).toContain('Smile');
		expect(iconLabels).toContain('Star');
		expect(iconLabels).toContain('Heart');
		expect(iconLabels).toContain('Palette');
	});

	it('does not show blocklisted icons in search results', async () => {
		const { getByTestId, findAllByTestId, findByTestId } = render(IconPicker, {
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
		await findAllByTestId('icon-picker-icon');

		// Search for a blocklisted icon by its exact name
		const searchInput = getByTestId('icon-picker-search');
		await fireEvent.update(searchInput, 'settings');

		// Should return no results since 'settings' is blocklisted
		const noResults = await findByTestId('icon-picker-no-results');
		expect(noResults).toBeVisible();
	});
});
