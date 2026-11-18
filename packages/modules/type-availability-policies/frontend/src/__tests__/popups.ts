import { waitFor } from '@testing-library/vue';
import { expect } from 'vitest';

export const MENU_ITEM = '[role="menuitem"],[role="menuitemcheckbox"]';
export const OPTION = '[role="option"]';

/** Menus and selects render their items in a popup outside the rendered component. */
export function popupLabels(selector: string) {
	return [...document.querySelectorAll(selector)].map((element) => element.textContent?.trim());
}

export async function findPopupItem(selector: string, label: string) {
	return await waitFor(() => {
		const item = [...document.querySelectorAll(selector)].find(
			(element) => element.textContent?.trim() === label,
		);
		expect(item).toBeDefined();
		return item!;
	});
}
