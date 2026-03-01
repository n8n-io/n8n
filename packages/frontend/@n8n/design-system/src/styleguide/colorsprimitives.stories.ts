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

export const Gray = Template(
	"<color-circles :colors=\"['--color--neutral-950', '--color--neutral-900', '--color--neutral-850', '--color--neutral-800', '--color--neutral-700', '--color--neutral-600', '--color--neutral-500', '--color--neutral-400', '--color--neutral-300', '--color--neutral-250', '--color--neutral-200', '--color--neutral-150', '--color--neutral-125', '--color--neutral-100', '--color--neutral-100', '--color--neutral-50', '--color--neutral-white']\" />",
);

export const Primary = Template(
	"<color-circles :colors=\"['--color--orange-400', '--color--orange-300', '--color--orange-250', '--color--orange-200', '--color--orange-150', '--color--orange-100', '--color--orange-50']\" />",
);

export const Secondary = Template(
	"<color-circles :colors=\"['--color--purple-900','--color--purple-700','--color--purple-600','--color--purple-500','--color--purple-400','--color--purple-300','--color--purple-200']\" />",
);

export const AlternateA = Template(
	"<color-circles :colors=\"['--color--green-900', '--color--green-700', '--color--green-600', '--color--green-300', '--color--green-200', '--color--green-100', '--color--green-50']\" />",
);

export const AlternateB = Template(
	"<color-circles :colors=\"['--color--gold-800', '--color--gold-700', '--color--gold-500', '--color--gold-400', '--color--gold-300', '--color--gold-200', '--color--gold-100', '--color--gold-50']\" />",
);

export const AlternateC = Template(
	"<color-circles :colors=\"['--color--red-900', '--color--red-800', '--color--red-700', '--color--red-600', '--color--red-400', '--color--red-300', '--color--red-250', '--color--red-100', '--color--red-50']\" />",
);

export const AlternateD = Template(
	"<color-circles :colors=\"['--color--yellow-800', '--color--yellow-700', '--color--yellow-200', '--color--yellow-100']\" />",
);

export const AlternateE = Template(
	"<color-circles :colors=\"['--color--blue-800', '--color--blue-700', '--color--blue-600', '--color--blue-500', '--color--blue-400', '--color--blue-200', '--color--blue-100']\" />",
);

export const AlternateF = Template('<color-circles :colors="[\'--color--mint-600\']" />');

export const AlternateG = Template('<color-circles :colors="[\'--color--slate-700\']" />');

export const AlternateH = Template('<color-circles :colors="[\'--color--red-400\']" />');
