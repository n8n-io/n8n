/**
 * Lucide icon category definitions for the icon picker.
 * Categories are listed in the official Lucide display order.
 * @see https://lucide.dev/icons/categories
 *
 * Category data (per-icon) comes from the auto-generated lucideIconData.ts file,
 * which fetches categories from the Lucide GitHub repo during generation.
 * This file only defines the display metadata (title, order) for those categories.
 *
 * Some Lucide data slugs map to the same display category:
 * - "currency" and "money" both map to "Finance"
 * - "navigation" and "maps" both map to "Navigation, Maps & POIs"
 *
 * To regenerate the per-icon category data, run:
 *   node scripts/generate-lucide-icon-data.mjs
 */

export interface IconCategoryDefinition {
	/** Unique key for this display category */
	key: string;
	/** i18n key for the section header label */
	labelKey: string;
	/** Lucide data slugs that map to this category */
	slugs: string[];
}

/**
 * Ordered list of icon categories matching the official Lucide categories page.
 * Empty categories (no matching icons) are automatically excluded during rendering.
 * @see https://lucide.dev/icons/categories
 */
export const ICON_CATEGORIES: IconCategoryDefinition[] = [
	{ key: 'accessibility', labelKey: 'iconPicker.iconSection.accessibility', slugs: ['accessibility'] },
	{ key: 'account', labelKey: 'iconPicker.iconSection.account', slugs: ['account'] },
	{ key: 'animals', labelKey: 'iconPicker.iconSection.animals', slugs: ['animals'] },
	{ key: 'arrows', labelKey: 'iconPicker.iconSection.arrows', slugs: ['arrows'] },
	{ key: 'brands', labelKey: 'iconPicker.iconSection.brands', slugs: ['brands'] },
	{ key: 'buildings', labelKey: 'iconPicker.iconSection.buildings', slugs: ['buildings'] },
	{ key: 'charts', labelKey: 'iconPicker.iconSection.charts', slugs: ['charts'] },
	{ key: 'communication', labelKey: 'iconPicker.iconSection.communication', slugs: ['communication'] },
	{ key: 'connectivity', labelKey: 'iconPicker.iconSection.connectivity', slugs: ['connectivity'] },
	{ key: 'cursors', labelKey: 'iconPicker.iconSection.cursors', slugs: ['cursors'] },
	{ key: 'design', labelKey: 'iconPicker.iconSection.design', slugs: ['design'] },
	{ key: 'development', labelKey: 'iconPicker.iconSection.development', slugs: ['development'] },
	{ key: 'devices', labelKey: 'iconPicker.iconSection.devices', slugs: ['devices'] },
	{ key: 'emoji', labelKey: 'iconPicker.iconSection.emoji', slugs: ['emoji'] },
	{ key: 'files', labelKey: 'iconPicker.iconSection.files', slugs: ['files'] },
	{ key: 'finance', labelKey: 'iconPicker.iconSection.finance', slugs: ['currency', 'money'] },
	{ key: 'food-beverage', labelKey: 'iconPicker.iconSection.foodBeverage', slugs: ['food-beverage'] },
	{ key: 'gaming', labelKey: 'iconPicker.iconSection.gaming', slugs: ['gaming'] },
	{ key: 'home', labelKey: 'iconPicker.iconSection.home', slugs: ['home'] },
	{ key: 'layout', labelKey: 'iconPicker.iconSection.layout', slugs: ['layout'] },
	{ key: 'mail', labelKey: 'iconPicker.iconSection.mail', slugs: ['mail'] },
	{ key: 'math', labelKey: 'iconPicker.iconSection.math', slugs: ['math'] },
	{ key: 'medical', labelKey: 'iconPicker.iconSection.medical', slugs: ['medical'] },
	{ key: 'multimedia', labelKey: 'iconPicker.iconSection.multimedia', slugs: ['multimedia'] },
	{ key: 'nature', labelKey: 'iconPicker.iconSection.nature', slugs: ['nature'] },
	{ key: 'navigation', labelKey: 'iconPicker.iconSection.navigation', slugs: ['navigation', 'maps'] },
	{ key: 'notifications', labelKey: 'iconPicker.iconSection.notifications', slugs: ['notifications'] },
	{ key: 'people', labelKey: 'iconPicker.iconSection.people', slugs: ['people'] },
	{ key: 'photography', labelKey: 'iconPicker.iconSection.photography', slugs: ['photography'] },
	{ key: 'science', labelKey: 'iconPicker.iconSection.science', slugs: ['science'] },
	{ key: 'seasons', labelKey: 'iconPicker.iconSection.seasons', slugs: ['seasons'] },
	{ key: 'security', labelKey: 'iconPicker.iconSection.security', slugs: ['security'] },
	{ key: 'shapes', labelKey: 'iconPicker.iconSection.shapes', slugs: ['shapes'] },
	{ key: 'shopping', labelKey: 'iconPicker.iconSection.shopping', slugs: ['shopping'] },
	{ key: 'social', labelKey: 'iconPicker.iconSection.social', slugs: ['social'] },
	{ key: 'sports', labelKey: 'iconPicker.iconSection.sports', slugs: ['sports'] },
	{ key: 'sustainability', labelKey: 'iconPicker.iconSection.sustainability', slugs: ['sustainability'] },
	{ key: 'text', labelKey: 'iconPicker.iconSection.text', slugs: ['text'] },
	{ key: 'time', labelKey: 'iconPicker.iconSection.time', slugs: ['time'] },
	{ key: 'tools', labelKey: 'iconPicker.iconSection.tools', slugs: ['tools'] },
	{ key: 'transportation', labelKey: 'iconPicker.iconSection.transportation', slugs: ['transportation'] },
	{ key: 'travel', labelKey: 'iconPicker.iconSection.travel', slugs: ['travel'] },
	{ key: 'weather', labelKey: 'iconPicker.iconSection.weather', slugs: ['weather'] },
];

/** "Other" section for icons without any recognized category */
export const OTHER_CATEGORY: IconCategoryDefinition = {
	key: 'other',
	labelKey: 'iconPicker.iconSection.other',
	slugs: [],
};

/**
 * Reverse lookup: Lucide data slug → display category key.
 * Built once from ICON_CATEGORIES at import time.
 */
const SLUG_TO_CATEGORY_KEY: Record<string, string> = Object.fromEntries(
	ICON_CATEGORIES.flatMap((cat) => cat.slugs.map((slug) => [slug, cat.key])),
);

/**
 * Returns the display category key for an icon based on its first recognized category slug.
 * Falls back to 'other' if no category slug matches any defined category.
 *
 * This ensures each icon appears in exactly one section — its "primary" category
 * is determined by the first slug in its categories array that maps to a known
 * display category.
 */
export function getPrimaryCategoryKey(categories: string[]): string {
	for (const slug of categories) {
		const key = SLUG_TO_CATEGORY_KEY[slug];
		if (key !== undefined) return key;
	}
	return 'other';
}
