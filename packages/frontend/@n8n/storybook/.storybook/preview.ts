// Import from deep paths, not the '@n8n/design-system' barrel: preview.ts is a
// TurboSnap global, and the barrel's `export * from './components'` would make
// every component a global dep, forcing a full snapshot on any component change.
import { IconBodyLoaderKey } from '@n8n/design-system/composables/useIconBodyLoader';
import { loadLucideIconBody } from '@n8n/design-system/icons/lucide';
import { N8nPlugin } from '@n8n/design-system/plugin';
import { i18nInstance } from '@n8n/i18n';
import { setup } from '@storybook/vue3';
import ElementPlus from 'element-plus';
// @ts-expect-error no types
import lang from 'element-plus/dist/locale/en.mjs';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

import './storybook.scss';
import { withThemePreview } from './withThemePreview';
// import '../src/css/tailwind/index.css';

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
	options: {
		storySort: {
			method: 'alphabetical',
			order: ['Style guide', 'Core', 'Areas', 'Experimental'],
		},
	},
	chromatic: {
		disableSnapshot: false,
	},
};

export const decorators = [withThemePreview];

export const tags = ['autodocs'];
