import { app } from '@storybook/vue3';

import './font-awesome-icons';
import './storybook.scss';

import element from 'element-plus';
import { n8nDesignSystem } from '../src/plugins/n8nComponents';

// import lang from 'element-ui/lib/locale/lang/en';
// import locale from 'element-ui/lib/locale';

app.use(element);
app.use(n8nDesignSystem);

// locale.use(lang);
//
// // https://github.com/storybookjs/storybook/issues/6153
// Vue.prototype.toJSON = function () {
// 	return this;
// };

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
				class: 'theme-dark',
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
