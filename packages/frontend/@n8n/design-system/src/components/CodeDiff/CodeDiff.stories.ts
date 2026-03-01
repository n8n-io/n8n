import type { StoryFn } from '@storybook/vue3-vite';

import CodeDiff from './CodeDiff.vue';

export default {
	title: 'Assistant/CodeDiff',
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
	template: '<div style="width:300px; height:100%"><code-diff v-bind="args" /></div>',
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

export const Code = Template.bind({});
Code.args = {
	title: "Fix reference to the node and remove unsupported 'require' statement.",
	content:
		"--- original.js\n+++ modified.js\n@@ -1,2 +1,2 @@\n-const SIGNING_SECRET = $input.first().json.slack_secret_signature;\n-const item = $('Webhook to call for Slack command').first();\n+const SIGNING_SECRET = items[0].json.slack_secret_signature;\n+const item = items[0];\n@@ -7,8 +7,6 @@\n}\n\n-const crypto = require('crypto');\n-\n const { binary: { data } } = item;\n\n if (\n@@ -22,7 +20,7 @@\n const rawBody = Buffer.from(data.data, 'base64').toString()\n \n // compute the ",
	streaming: true,
};

export const StreamingTitleEmpty = Template.bind({});
StreamingTitleEmpty.args = {
	streaming: true,
};

export const StreamingTitle = Template.bind({});
StreamingTitle.args = {
	streaming: true,
	title: 'Hello world',
};

export const StreamingContentWithOneLine = Template.bind({});
StreamingContentWithOneLine.args = {
	streaming: true,
	title: 'Hello world',
	content: '@@ -1,7 +1,6 @@\n-The Way that can be told of is not th',
};

export const StreamingContentWithMultipleLines = Template.bind({});
StreamingContentWithMultipleLines.args = {
	streaming: true,
	title: 'Hello world',
	content:
		'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can b',
};

export const StreamingWithManyManyLines = Template.bind({});
StreamingWithManyManyLines.args = {
	title: 'Lao Tzu example unified diff',
	content:
		'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
	streaming: true,
};

export const Replaced = Template.bind({});
Replaced.args = {
	title: 'Lao Tzu example unified diff',
	content:
		'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
	replaced: true,
};

export const Replacing = Template.bind({});
Replacing.args = {
	title: 'Lao Tzu example unified diff',
	content:
		'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
	replacing: true,
};

export const Error = Template.bind({});
Error.args = {
	title: 'Lao Tzu example unified diff',
	content:
		'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
	error: true,
};
