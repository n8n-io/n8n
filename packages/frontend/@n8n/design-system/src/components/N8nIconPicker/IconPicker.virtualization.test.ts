import { fireEvent, render, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';

const largeLucideIconSet = vi.hoisted(() =>
	Object.fromEntries(
		Array.from({ length: 35 }, (_, index) => [
			`icon-${index + 1}`,
			{
				keywords: ['icon', `icon-${index + 1}`],
				categories: ['design'],
			},
		]),
	),
);

const sharedLoaderMock = vi.hoisted(() => ({
	loadLucideIconBody: vi.fn(async () => null),
	loadLucideIconBodies: vi.fn(async (names: string[]) =>
		Object.fromEntries(names.map((name) => [name, `<path data-icon="${name}" />`])),
	),
}));

vi.mock('./lucideIconData', () => ({
	lucideIcons: largeLucideIconSet,
	lucideCategories: ['design'],
}));

vi.mock('@iconify/json/json/lucide.json', () => ({
	default: {
		icons: Object.fromEntries(
			Object.keys(largeLucideIconSet).map((name) => [name, { body: `<path data-icon="${name}" />` }]),
		),
	},
}));

vi.mock('./emojiData', () => ({
	emojiSections: [
		{
			key: 'people',
			labelKey: 'iconPicker.emojiSection.people',
			emojis: [{ u: '😀', l: 'Grinning Face', k: ['grinning'], display: '😀' }],
		},
	],
}));

vi.mock('../N8nIcon/lucideIconLoader', () => sharedLoaderMock);
vi.mock('is-emoji-supported', () => ({
	isEmojiSupported: () => true,
}));

import IconPicker from '.';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			name: 'icons',
			component: { template: '<div />' },
		},
	],
});

describe('IconPicker virtualization', () => {
	beforeEach(() => {
		sharedLoaderMock.loadLucideIconBody.mockClear();
		sharedLoaderMock.loadLucideIconBodies.mockClear();
	});

	it('loads only visible icon bodies in browse mode', async () => {
		const { getByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: 'icon-1' },
				buttonTooltip: 'Select an icon',
			},
			global: {
				plugins: [router],
				stubs: ['N8nButton', 'N8nIcon'],
			},
		});

		await fireEvent.click(getByTestId('icon-picker-button'));

		await waitFor(() => {
			expect(document.querySelectorAll('[data-test-id="icon-picker-icon"]').length).toBeGreaterThan(0);
		});

		await waitFor(() => {
			expect(document.querySelectorAll('[data-test-id="icon-picker-icon"]').length).toBeLessThan(35);
		});
		expect(sharedLoaderMock.loadLucideIconBodies).toHaveBeenCalled();
	});

	it('keeps broad search results virtualized', async () => {
		const { getByTestId } = render(IconPicker, {
			props: {
				modelValue: { type: 'icon', value: 'icon-1' },
				buttonTooltip: 'Select an icon',
			},
			global: {
				plugins: [router],
				stubs: ['N8nButton', 'N8nIcon'],
			},
		});

		await fireEvent.click(getByTestId('icon-picker-button'));

		const searchInput = getByTestId('icon-picker-search');
		await fireEvent.update(searchInput, 'icon');

		await waitFor(() => {
			expect(document.querySelectorAll('[data-test-id="icon-picker-icon"]').length).toBeGreaterThan(0);
		});

		await waitFor(() => {
			expect(document.querySelectorAll('[data-test-id="icon-picker-icon"]').length).toBeLessThan(35);
		});
	});
});
