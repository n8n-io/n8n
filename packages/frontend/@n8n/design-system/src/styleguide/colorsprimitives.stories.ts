import { type StoryFn } from '@storybook/vue3';

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
	"<color-circles :colors=\"['--prim-gray-820', '--prim-gray-800', '--prim-gray-740', '--prim-gray-670', '--prim-gray-540', '--prim-gray-490', '--prim-gray-420', '--prim-gray-320', '--prim-gray-200', '--prim-gray-120', '--prim-gray-70', '--prim-gray-30', '--prim-gray-40', '--prim-gray-10', '--prim-gray-0']\" />",
);

export const Primary = Template(
	"<color-circles :colors=\"['--prim-color-primary-shade-300', '--prim-color-primary-shade-100', '--prim-color-primary', '--prim-color-primary-tint-100', '--prim-color-primary-tint-200', '--prim-color-primary-tint-250', '--prim-color-primary-tint-300']\" />",
);

export const Secondary = Template(
	"<color-circles :colors=\"['--prim-color-secondary-shade-250', '--prim-color-secondary-shade-100', '--prim-color-secondary', '--prim-color-secondary-tint-100', '--prim-color-secondary-tint-200', '--prim-color-secondary-tint-300', '--prim-color-secondary-tint-400']\" />",
);

export const AlternateA = Template(
	"<color-circles :colors=\"['--prim-color-alt-a-shade-200', '--prim-color-alt-a-shade-100', '--prim-color-alt-a', '--prim-color-alt-a-tint-300', '--prim-color-alt-a-tint-400', '--prim-color-alt-a-tint-500', '--prim-color-alt-a-tint-550']\" />",
);

export const AlternateB = Template(
	"<color-circles :colors=\"['--prim-color-alt-b-shade-350', '--prim-color-alt-b-shade-250', '--prim-color-alt-b-shade-100', '--prim-color-alt-b', '--prim-color-alt-b-tint-150', '--prim-color-alt-b-tint-250', '--prim-color-alt-b-tint-300', '--prim-color-alt-b-tint-400']\" />",
);

export const AlternateC = Template(
	"<color-circles :colors=\"['--prim-color-alt-c-shade-250', '--prim-color-alt-c-shade-150', '--prim-color-alt-c-shade-100', '--prim-color-alt-c', '--prim-color-alt-c-tint-150', '--prim-color-alt-c-tint-250', '--prim-color-alt-c-tint-300', '--prim-color-alt-c-tint-400', '--prim-color-alt-c-tint-450']\" />",
);

export const AlternateD = Template(
	"<color-circles :colors=\"['--prim-color-alt-d-shade-700', '--prim-color-alt-d-shade-600', '--prim-color-alt-d-shade-150', '--prim-color-alt-d']\" />",
);

export const AlternateE = Template(
	"<color-circles :colors=\"['--prim-color-alt-e-shade-350', '--prim-color-alt-e-shade-250', '--prim-color-alt-e-shade-150', '--prim-color-alt-e-shade-100', '--prim-color-alt-e', '--prim-color-alt-e-tint-250', '--prim-color-alt-e-tint-350']\" />",
);

export const AlternateF = Template(
	"<color-circles :colors=\"['--prim-color-alt-f', '--prim-color-alt-f-tint-150']\" />",
);

export const AlternateG = Template(
	"<color-circles :colors=\"['--prim-color-alt-g', '--prim-color-alt-g-tint-150']\" />",
);

export const AlternateH = Template('<color-circles :colors="[\'--prim-color-alt-h\']" />');

export const AlternateI = Template('<color-circles :colors="[\'--prim-color-alt-i\']" />');

export const AlternateJ = Template('<color-circles :colors="[\'--prim-color-alt-j\']" />');
