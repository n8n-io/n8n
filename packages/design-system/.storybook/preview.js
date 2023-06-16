import { setup } from '@storybook/vue3';

import './storybook.scss';

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

// import ElementUI from 'element-ui';
// import lang from 'element-ui/lib/locale/lang/en';
// import { locale } from 'element-plus';

import { N8nPlugin } from '../src/plugin';

// import Vue from 'vue';
//
// Vue.use(ElementUI);
// Vue.use(N8nPlugin);
//

// // https://github.com/storybookjs/storybook/issues/6153
// Vue.prototype.toJSON = function () {
// 	return this;
// };

setup((app) => {
	library.add(fas);

	// locale.use(lang);

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
