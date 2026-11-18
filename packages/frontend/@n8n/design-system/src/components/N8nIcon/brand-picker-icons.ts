import type { Component } from 'vue';

import { BRAND_ICON_FILLED_SUFFIX, BRAND_ICON_PREFIX } from './brandIcons';

/**
 * The n8n brand icons that have both a 16px outline and a 16px solid version, for the icon
 * picker. `N8nIcon` loads this module on the first `brand:` icon, so it stays out of the
 * main bundle. See `brandIcons.ts` for the names.
 */

const outlineIcons = import.meta.glob<Component>('./custom/brand/*--outline-16.svg', {
	eager: true,
	import: 'default',
});
const solidIcons = import.meta.glob<Component>('./custom/brand/*--solid-16.svg', {
	eager: true,
	import: 'default',
});

const baseName = (path: string, suffix: string) =>
	path.slice(path.lastIndexOf('/') + 1, -suffix.length);

const solidByName = new Map(
	Object.entries(solidIcons).map(([path, icon]) => [baseName(path, '--solid-16.svg'), icon]),
);

/** The picker's icon names, in their outline form, sorted by name */
export const brandIconNames: string[] = [];

export const brandIconSet: Record<string, Component> = {};

for (const [path, outline] of Object.entries(outlineIcons)) {
	const name = baseName(path, '--outline-16.svg');
	const solid = solidByName.get(name);
	if (!solid) continue;
	brandIconSet[`${BRAND_ICON_PREFIX}${name}`] = outline;
	brandIconSet[`${BRAND_ICON_PREFIX}${name}${BRAND_ICON_FILLED_SUFFIX}`] = solid;
	brandIconNames.push(`${BRAND_ICON_PREFIX}${name}`);
}

brandIconNames.sort();
