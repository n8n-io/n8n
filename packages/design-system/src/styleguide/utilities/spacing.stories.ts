/* tslint:disable:variable-name */

import {StoryFn} from "@storybook/vue";
import SpacingPreview from "../components/SpacingPreview.vue";

export default {
	title: 'Utilities/Spacing',
};

const Template: StoryFn = (args, {argTypes}) => ({
	props: Object.keys(argTypes),
	components: {
		SpacingPreview,
	},
	template: `<spacing-preview v-bind="$props" />`,
});

export const Padding = Template.bind({});
Padding.args = { property: 'padding' };

export const PaddingTop = Template.bind({});
PaddingTop.args = { property: 'padding', side: 'top' };

export const PaddingRight = Template.bind({});
PaddingRight.args = { property: 'padding', side: 'right' };

export const PaddingBottom = Template.bind({});
PaddingBottom.args = { property: 'padding', side: 'bottom' };

export const PaddingLeft = Template.bind({});
PaddingLeft.args = { property: 'padding', side: 'left' };

export const Margin = Template.bind({});
Margin.args = { property: 'margin' };

export const MarginTop = Template.bind({});
MarginTop.args = { property: 'margin', side: 'top' };

export const MarginRight = Template.bind({});
MarginRight.args = { property: 'margin', side: 'right' };

export const MarginBottom = Template.bind({});
MarginBottom.args = { property: 'margin', side: 'bottom' };

export const MarginLeft = Template.bind({});
MarginLeft.args = { property: 'margin', side: 'left' };

