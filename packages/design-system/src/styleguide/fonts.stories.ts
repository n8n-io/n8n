import { type StoryFn } from '@storybook/vue3';

import Sizes from './Sizes.vue';
import VariableTable from './VariableTable.vue';

export default {
	title: 'Styleguide/Font',
};

export const FontSize: StoryFn = () => ({
	components: {
		Sizes,
	},
	template:
		"<sizes :variables=\"['--font-size-3xs', '--font-size-2xs','--font-size-xs','--font-size-s','--font-size-m','--font-size-l','--font-size-xl','--font-size-2xl']\" attr=\"font-size\" />",
});

const Template =
	(template: string): StoryFn =>
	() => ({
		components: {
			VariableTable,
		},
		template,
	});

export const LineHeight = Template(
	"<variable-table :variables=\"['--font-line-height-compact','--font-line-height-regular','--font-line-height-loose','--font-line-height-xloose']\" />",
);

export const FontWeight = Template(
	'<variable-table :variables="[\'--font-weight-regular\',\'--font-weight-bold\']" attr="font-weight" />',
);

export const FontFamily = Template(
	'<variable-table :variables="[\'--font-family\']" attr="font-family" />',
);
