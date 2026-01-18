import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { setup } from '@storybook/vue3';
import ElementPlus from 'element-plus';
// @ts-expect-error no types
import lang from 'element-plus/dist/locale/en.mjs';

import { N8nPlugin } from '@n8n/design-system';

import './storybook.scss';
import { allModes } from './modes';
// import '../src/css/tailwind/index.css';

setup((app) => {
	app.use(ElementPlus, {
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
		default: '--color--background--light-3',
		values: [
			{
				name: '--color--background--shade-2',
				value: 'var(--color--background--shade-2)',
			},
			{
				name: '--color--background',
				value: 'var(--color--background)',
			},
			{
				name: '--color--background--light-2',
				value: 'var(--color--background--light-2)',
			},
			{
				name: '--color--background--light-3',
				value: 'var(--color--background--light-3)',
			},
		],
	},
	themes: {
		default: 'light',
		list: [
			{
				name: 'light',
				class: 'theme-light',
				color: '#fff',
			},
			{
				name: 'dark',
				class: 'theme-dark-beta',
				color: '#000',
			},
		],
	},
	options: {
		storySort: {
			order: [
				'Docs',
				'Styleguide',
				['Colors Primitives', 'Colors Tokens', 'Font', 'Spacing', 'Border'],
				'Atoms',
				'Modules',
			],
		},
	},
	chromatic: {
		modes: {
			light: allModes['light'],
			dark: allModes['dark'],
		},
		disableSnapshot: false,
	},
};

export const decorators = [
	withThemeByDataAttribute({
		themes: {
			light: 'light',
			dark: 'dark',
		},
		defaultTheme: 'light',
		attributeName: 'data-theme',
		parentSelector: 'body',
	}),
];

export const tags = ['autodocs'];
