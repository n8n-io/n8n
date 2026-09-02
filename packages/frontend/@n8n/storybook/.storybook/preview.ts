// Import from the subpath entries, not the '@n8n/design-system' barrel: preview.ts
// is a TurboSnap global, and the barrel's `export * from './components'` would make
// every component a global dep, forcing a full snapshot on any component change.
// Both specifiers are published `exports` keys, so they resolve outside this
// monorepo alias too.
import { IconBodyLoaderKey, loadLucideIconBody } from '@n8n/design-system/icons/lucide';
import { N8nPlugin } from '@n8n/design-system/plugin';
import { i18nInstance } from '@n8n/i18n';
import { setup } from '@storybook/vue3';
import { DARK_MODE_EVENT_NAME } from '@vueless/storybook-dark-mode';
import ElementPlus from 'element-plus';
// @ts-expect-error no types
import lang from 'element-plus/dist/locale/en.mjs';
import { createPinia } from 'pinia';
import { addons } from 'storybook/preview-api';
import { createMemoryHistory, createRouter } from 'vue-router';

import { applyN8nTheme, isDarkModeStored } from './applyN8nTheme';
import { ThemedDocsContainer } from './ThemedDocsContainer';
import './storybook.scss';

const channel = addons.getChannel();
applyN8nTheme(isDarkModeStored());
channel.on(DARK_MODE_EVENT_NAME, applyN8nTheme);

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
	themes: {
		disable: true,
	},
	darkMode: {
		stylePreview: true,
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

export const tags = ['autodocs'];
