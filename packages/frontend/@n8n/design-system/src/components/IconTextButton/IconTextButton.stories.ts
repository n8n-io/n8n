import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import IconTextButton from './IconTextButton.vue';

export default {
	title: 'Atoms/IconTextButton',
	component: IconTextButton,
	argTypes: {
		icon: {
			control: 'text',
		},
		iconSize: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'],
		},
		iconPosition: {
			control: 'select',
			options: ['left', 'right'],
		},
		disabled: {
			control: 'boolean',
		},
		active: {
			control: 'boolean',
		},
	},
};

const methods = {
	onClick: action('click'),
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		IconTextButton,
	},
	template: '<IconTextButton v-bind="args" @click="onClick">Button text</IconTextButton>',
	methods,
});

export const Default = Template.bind({});
Default.args = {
	icon: 'undo-2',
};

export const IconOnRight = Template.bind({});
IconOnRight.args = {
	icon: 'arrow-up-right',
	iconPosition: 'right',
};

export const Disabled = Template.bind({});
Disabled.args = {
	icon: 'undo-2',
	disabled: true,
};

export const Active = Template.bind({});
Active.args = {
	icon: 'undo-2',
	active: true,
};

const AllStatesTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		IconTextButton,
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 16px;">
			<div>
				<strong>Default:</strong>
				<IconTextButton v-bind="args" @click="onClick">Restore version</IconTextButton>
			</div>
			<div>
				<strong>Icon on right:</strong>
				<IconTextButton v-bind="args" icon="arrow-up-right" icon-position="right" @click="onClick">Show version</IconTextButton>
			</div>
			<div>
				<strong>Disabled:</strong>
				<IconTextButton v-bind="args" :disabled="true" @click="onClick">Restore version</IconTextButton>
			</div>
			<div>
				<strong>Active:</strong>
				<IconTextButton v-bind="args" :active="true" @click="onClick">Restore version</IconTextButton>
			</div>
		</div>
	`,
	methods,
});

export const AllStates = AllStatesTemplate.bind({});
AllStates.args = {
	icon: 'undo-2',
};
