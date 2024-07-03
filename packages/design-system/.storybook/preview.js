import { setup } from '@storybook/vue3';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

import './storybook.scss';
// import '../src/css/tailwind/index.css';

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

import ElementPlus from 'element-plus';
import lang from 'element-plus/lib/locale/lang/en';

import { N8nPlugin } from '../src/plugin';

setup((app) => {
	library.add(fas);

	app.use(ElementPlus, {
		locale: lang,
	});

	app.use(N8nPlugin);
});

export const parameters = {
	controls: {
		matchers: {
			color: /(background|color)$/i,
			date: /Date$/,
		},
	},
	backgrounds: {
		default: '--color-background-xlight',
		values: [
			{
				name: '--color-background-dark',
				value: 'var(--color-background-dark)',
			},
			{
				name: '--color-background-base',
				value: 'var(--color-background-base)',
			},
			{
				name: '--color-background-light',
				value: 'var(--color-background-light)',
			},
			{
				name: '--color-background-xlight',
				value: 'var(--color-background-xlight)',
			},
		],
	},
	themes: {
		list: [
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
