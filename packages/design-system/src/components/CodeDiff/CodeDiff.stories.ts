import CodeDiff from './CodeDiff.vue';
import type { StoryFn } from '@storybook/vue3';

export default {
	title: 'Atoms/CodeDiff',
	component: CodeDiff,
	argTypes: {},
};

const methods = {};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		CodeDiff,
	},
	template: '<div style="width:275px; height:100%"><code-diff v-bind="args" /></div>',
	methods,
});

export const Example = Template.bind({});
Example.args = {
	title: 'Lao Tzu example unified diff',
	content:
		'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
};

export const Empty = Template.bind({});
Empty.args = {};
