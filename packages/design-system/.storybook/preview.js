import { setup } from '@storybook/vue3';

import './storybook.scss';

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
	actions: {
		argTypesRegex: '^on[A-Z].*',
	},
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
				name: '--color-background-lighter',
				value: 'var(--color-background-lighter)',
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
			order: ['Docs', 'Styleguide', 'Atoms', 'Modules'],
		},
	},
};
