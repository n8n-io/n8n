import type { StoryFn } from '@storybook/vue3';
import { ref } from 'vue';

import N8nPopoverReka from './N8nPopoverReka.vue';
import N8nButton from '../N8nButton/Button.vue';
import N8nInput from '../N8nInput/Input.vue';

export default {
	title: 'Atoms/PopoverReka',
	component: N8nPopoverReka,
};

const Template: StoryFn = (args) => ({
	setup() {
		const username = ref('');
		const email = ref('');

		return { args, username, email };
	},
	components: {
		N8nPopoverReka,
		N8nButton,
		N8nInput,
	},
	template: `
		<div style="padding: 50px;">
			<N8nPopoverReka v-bind="args">
				<template #trigger>
					<N8nButton type="primary">Open Form</N8nButton>
				</template>
				<template #content>
					<div style="display: flex; flex-direction: column; gap: 12px;">
						<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">User Information</h3>
						<N8nInput
							v-model="username"
							placeholder="Enter username"
							label="Username"
						/>
						<N8nInput
							v-model="email"
							placeholder="Enter email"
							label="Email"
							type="email"
						/>
						<div style="display: flex; gap: 8px; margin-top: 8px;">
							<N8nButton size="small" type="primary">Save</N8nButton>
							<N8nButton size="small" type="secondary">Cancel</N8nButton>
						</div>
					</div>
				</template>
			</N8nPopoverReka>
		</div>
	`,
});

export const SimpleExample = Template.bind({});
SimpleExample.args = {};
SimpleExample.storyName = 'With Form Inputs';
