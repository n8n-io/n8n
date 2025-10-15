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
	"<color-circles :colors=\"['--p--color--gray-820', '--p--color--gray-800', '--p--color--gray-780', '--p--color--gray-740', '--p--color--gray-710', '--p--color--gray-670', '--p--color--gray-540', '--p--color--gray-490', '--p--color--gray-420', '--p--color--gray-320', '--p--color--gray-200', '--p--color--gray-120', '--p--color--gray-070', '--p--color--gray-040', '--p--color--gray-030', '--p--color--gray-025', '--p--color--gray-010', '--p--color--white']\" />",
);

export const Primary = Template(
	"<color-circles :colors=\"['--p--color--primary-420', '--p--color--primary-320', '--p--color--primary-220', '--p--color--primary-120', '--p--color--primary-070', '--p--color--primary-050', '--p--color--primary-030']\" />",
);

export const Secondary = Template(
	"<color-circles :colors=\"['--p--color--secondary-720','--p--color--secondary-570','--p--color--secondary-470','--p--color--secondary-370','--p--color--secondary-270','--p--color--secondary-170','--p--color--secondary-070']\" />",
);

export const AlternateA = Template(
	"<color-circles :colors=\"['--p--color--alt-a-800', '--p--color--alt-a-700', '--p--color--alt-a-600', '--p--color--alt-a-300', '--p--color--alt-a-200', '--p--color--alt-a-100', '--p--color--alt-a-050']\" />",
);

export const AlternateB = Template(
	"<color-circles :colors=\"['--p--color--alt-b-780', '--p--color--alt-b-680', '--p--color--alt-b-530', '--p--color--alt-b-430', '--p--color--alt-b-280', '--p--color--alt-b-180', '--p--color--alt-b-130', '--p--color--alt-b-030']\" />",
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

export const AlternateF = Template('<color-circles :colors="[\'--color--green-light-600\']" />');

export const AlternateG = Template('<color-circles :colors="[\'--color--slate-700\']" />');

export const AlternateH = Template('<color-circles :colors="[\'--p--color--alt-h-310\']" />');
