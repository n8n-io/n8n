import { type StoryFn } from '@storybook/vue3';

import VariableTable from './VariableTable.vue';

export default {
	title: 'Styleguide/Border',
	parameters: {
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/DxLbnIyMK8X0uLkUguFV4n/n8n-design-system_v1?node-id=79%3A6898',
		},
	},
};

const Template =
	(template: string): StoryFn =>
	() => ({
		components: {
			VariableTable,
		},
		template,
	});

export const BorderRadius = Template(
	"<variable-table :variables=\"['--border-radius-small','--border-radius-base', '--border-radius-large', '--border-radius-xlarge']\" />",
);

export const BorderWidth = Template('<variable-table :variables="[\'--border-width-base\']" />');

export const BorderStyle = Template('<variable-table :variables="[\'--border-style-base\']" />');
