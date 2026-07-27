import type { StoryFn } from '@storybook/vue3-vite';

import N8nStepper from './Stepper.vue';
import N8nButton from '../N8nButton/Button.vue';
import N8nCallout from '../N8nCallout/Callout.vue';
import N8nText from '../N8nText/Text.vue';

interface StepperStep {
	id: string;
	title: string;
	description?: string;
}

interface Args {
	steps: StepperStep[];
	showIndex: boolean;
}

export default {
	title: 'Core/Stepper',
	component: N8nStepper,
	argTypes: {
		steps: {
			control: {
				type: 'object',
			},
			description: 'Ordered list of steps to render.',
		},
		showIndex: {
			control: {
				type: 'boolean',
			},
			description: 'Show numbered indicators instead of simple dots.',
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A horizontal stepper for guiding users through a short multi-step process.',
			},
		},
	},
};

const installDetails: Record<string, { body: string; action?: string; command?: string }> = {
	account: {
		body: 'Create your n8n account, choose a workspace name, and invite teammates who should help build automations.',
		action: 'Open signup',
	},
	install: {
		body: 'Install n8n locally with npm, or use Docker if you prefer an isolated runtime.',
		command: 'npm install n8n -g',
	},
	connect: {
		body: 'Add credentials for the apps you want to automate, then test each connection before building your first workflow.',
		action: 'Add credentials',
	},
	launch: {
		body: 'Run a final manual test, activate the workflow, and monitor the first production executions.',
		action: 'Activate workflow',
	},
};

const Template: StoryFn<Args> = (args, { argTypes }) => ({
	setup: () => ({ args, installDetails }),
	props: Object.keys(argTypes),
	components: {
		N8nButton,
		N8nCallout,
		N8nStepper,
		N8nText,
	},
	template: `
		<div style="max-width: 1100px; padding: var(--spacing--md);">
			<n8n-stepper v-bind="args">
				<template #default="{ step }">
					<div style="margin-top: var(--spacing--sm); padding-right: var(--spacing--md);">
						<n8n-text color="text-light" size="small">
							{{ installDetails[step.id].body }}
						</n8n-text>

						<n8n-callout
							v-if="installDetails[step.id].command"
							style="margin-top: var(--spacing--sm);"
							theme="secondary"
							icon="terminal"
						>
							<code>{{ installDetails[step.id].command }}</code>
						</n8n-callout>

						<n8n-button
							v-if="installDetails[step.id].action"
							style="margin-top: var(--spacing--sm);"
							size="small"
							variant="outline"
						>
							{{ installDetails[step.id].action }}
						</n8n-button>
					</div>
				</template>
			</n8n-stepper>
		</div>
	`,
});

export const InstallProcess = Template.bind({});
InstallProcess.args = {
	showIndex: true,
	steps: [
		{
			id: 'account',
			title: 'Create workspace',
			description: 'Set up your team',
		},
		{
			id: 'install',
			title: 'Install n8n',
			description: 'Prepare your environment',
		},
		{
			id: 'connect',
			title: 'Connect apps',
			description: 'Add credentials',
		},
		{
			id: 'launch',
			title: 'Go live',
			description: 'Activate your workflow',
		},
	],
};

export const WithoutIndex = Template.bind({});
WithoutIndex.args = {
	...InstallProcess.args,
	showIndex: false,
};
