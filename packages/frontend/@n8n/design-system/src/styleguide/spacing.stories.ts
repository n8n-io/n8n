import { type StoryFn } from '@storybook/vue3-vite';

import Sizes from './Sizes.vue';

export default {
	title: 'Styleguide/Spacing',
	parameters: {
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/DxLbnIyMK8X0uLkUguFV4n/n8n-design-system_v1?node-id=79%3A6898',
		},
	},
};

export const Spacing: StoryFn = () => ({
	components: {
		Sizes,
	},
	template:
		"<sizes :variables=\"['--spacing--5xs','--spacing--4xs','--spacing--3xs','--spacing--2xs','--spacing--xs','--spacing--sm','--spacing--md','--spacing--lg','--spacing--xl','--spacing--2xl','--spacing--3xl','--spacing--4xl','--spacing--5xl']\" />",
});
