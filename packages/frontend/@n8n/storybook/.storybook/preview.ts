// Import from the subpath entries, not the '@n8n/design-system' barrel: preview.ts
// is a TurboSnap global, and the barrel's `export * from './components'` would make
// every component a global dep, forcing a full snapshot on any component change.
// Both specifiers are published `exports` keys, so they resolve outside this
// monorepo alias too.
import { IconBodyLoaderKey, loadLucideIconBody } from '@n8n/design-system/icons/lucide';
import { N8nPlugin } from '@n8n/design-system/plugin';
import { i18nInstance } from '@n8n/i18n';
import { DecoratorHelpers } from '@storybook/addon-themes';
import { setup, type Decorator } from '@storybook/vue3';
import ElementPlus from 'element-plus';
// @ts-expect-error no types
import lang from 'element-plus/dist/locale/en.mjs';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

import { applyN8nTheme } from './applyN8nTheme';
import { ThemedDocsContainer } from './ThemedDocsContainer';
import './storybook.scss';

const { initializeThemeState, pluckThemeFromContext } = DecoratorHelpers;

const THEME_NAMES = ['light', 'dark'] as const;
const DEFAULT_THEME = 'light';

initializeThemeState([...THEME_NAMES], DEFAULT_THEME);

function themeOverrideFromParameters(parameters: Record<string, unknown>): string | undefined {
	const themes = parameters.themes;
	if (typeof themes !== 'object' || themes === null || !('themeOverride' in themes)) {
		return undefined;
	}

	const override = themes.themeOverride;
	return typeof override === 'string' ? override : undefined;
}

function hasAppliedTheme(): boolean {
	const current = document.body.dataset.theme;
	return current === 'light' || current === 'dark';
}

setup((app) => {
	app.provide(IconBodyLoaderKey, loadLucideIconBody);

	const pinia = createPinia();
	app.use(pinia);
	app.use(i18nInstance);

	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:catchAll(.*)', component: { template: '' } }],
	});
	app.use(router);

	app.use(ElementPlus, {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- element-plus locale .mjs ships no types
		locale: lang,
	});

	app.use(N8nPlugin, {});
});

export const parameters = {
	controls: {
		matchers: {
			color: /(background|color)$/i,
			date: /Date$/,
		},
	},
	backgrounds: {
		disable: true,
	},
	options: {
		storySort: {
			method: 'alphabetical',
			order: ['Style Guide', 'Core', 'Areas', 'Experimental'],
			includeNames: false,
		},
	},
	docs: {
		container: ThemedDocsContainer,
	},
	chromatic: {
		disableSnapshot: false,
	},
};

const withN8nTheme: Decorator = (storyFn, context) => {
	const selected = pluckThemeFromContext(context);
	const theme =
		themeOverrideFromParameters(context.parameters) ?? (selected?.length ? selected : undefined);

	// Docs remounts every embedded story on a toolbar change. Those stories can
	// render before `globals.theme` is set; falling back to light paints the
	// page white after it already went dark.
	if (theme) {
		applyN8nTheme(theme);
	} else if (!hasAppliedTheme()) {
		applyN8nTheme(DEFAULT_THEME);
	}

	return storyFn();
};

export const decorators = [withN8nTheme];

export const tags = ['autodocs'];
