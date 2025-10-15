import { type StoryFn } from '@storybook/vue3-vite';

import ColorCircles from './ColorCircles.vue';

export default {
	title: 'Styleguide/Colors Primitives',
	parameters: {
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/DxLbnIyMK8X0uLkUguFV4n/n8n-design-system_v1?node-id=2%3A23',
		},
	},
};

const Template =
	(template: string): StoryFn =>
	() => ({
		components: {
			ColorCircles,
		},
		template,
	});

export const White = Template(
	"<color-circles :colors=\"['--color--white', '--color--white-alpha-100', '--color--white-alpha-200', '--color--white-alpha-300', '--color--white-alpha-400', '--color--white-alpha-500', '--color--white-alpha-600', '--color--white-alpha-700', '--color--white-alpha-800', '--color--white-alpha-900']\" />",
);

export const Black = Template(
	"<color-circles :colors=\"['--color--black', '--color--black-alpha-100', '--color--black-alpha-200', '--color--black-alpha-300', '--color--black-alpha-400', '--color--black-alpha-500', '--color--black-alpha-600', '--color--black-alpha-700', '--color--black-alpha-800', '--color--black-alpha-900']\" />",
);

export const Gray = Template(
	"<color-circles :colors=\"['--color--gray-50', '--color--gray-100', '--color--gray-150', '--color--gray-200', '--color--gray-250', '--color--gray-300', '--color--gray-400', '--color--gray-500', '--color--gray-600', '--color--gray-700', '--color--gray-800', '--color--gray-850', '--color--gray-900', '--color--gray-950']\" />",
);

export const Orange = Template(
	"<color-circles :colors=\"['--color--orange-50', '--color--orange-100', '--color--orange-150', '--color--orange-200', '--color--orange-250', '--color--orange-300', '--color--orange-400', '--color--orange-500', '--color--orange-600', '--color--orange-700', '--color--orange-800', '--color--orange-900', '--color--orange-950']\" />",
);

export const Purple = Template(
	"<color-circles :colors=\"['--color--purple-50', '--color--purple-200', '--color--purple-300', '--color--purple-400', '--color--purple-500', '--color--purple-600', '--color--purple-700', '--color--purple-900', '--color--purple-800', '--color--purple-900']\" />",
);

export const Green = Template(
	"<color-circles :colors=\"['--color--green-50', '--color--green-100', '--color--green-200', '--color--green-300', '--color--green-500', '--color--green-600', '--color--green-700', '--color--green-800', '--color--green-900']\" />",
);

export const Blue = Template(
	"<color-circles :colors=\"['--color--blue-50', '--color--blue-100', '--color--blue-200', '--color--blue-300', '--color--blue-400', '--color--blue-500', '--color--blue-600', '--color--blue-700', '--color--blue-800', '--color--blue-900']\" />",
);

export const Gold = Template(
	"<color-circles :colors=\"['--color--gold-50', '--color--gold-100', '--color--gold-200', '--color--gold-300', '--color--gold-400', '--color--gold-500', '--color--gold-600', '--color--gold-700', '--color--gold-800', '--color--gold-900']\" />",
);

export const Red = Template(
	"<color-circles :colors=\"['--color--red-50', '--color--red-100', '--color--red-200', '--color--red-300', '--color--red-400', '--color--red-400', '--color--red-600', '--color--red-600', '--color--red-650', '--color--red-700', '--color--red-800']\" />",
);

export const Yellow = Template(
	"<color-circles :colors=\"['--color--yellow-100', '--color--yellow-200', '--color--yellow-300', '--color--yellow-400', '--color--yellow-500', '--color--yellow-600', '--color--yellow-700', '--color--yellow-800', '--color--yellow-900']\" />",
);

export const GreenLight = Template(
	"<color-circles :colors=\"['--color--green-light-100', '--color--green-light-200', '--color--green-light-300', '--color--green-light-400', '--color--green-light-500', '--color--green-light-600', '--color--green-light-700', '--color--green-light-800', '--color--green-light-900']\" />",
);

export const Slate = Template(
	"<color-circles :colors=\"['--color--slate-100', '--color--slate-200', '--color--slate-300', '--color--slate-400', '--color--slate-500', '--color--slate-600', '--color--slate-700', '--color--slate-800', '--color--slate-900']\" />",
);
