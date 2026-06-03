import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nAiModelSelectorDropdown from './AiModelSelectorDropdown.vue';
import type { AiModelSelectorMenuItem } from './AiModelSelectorDropdown.types';

const items: AiModelSelectorMenuItem[] = [
	{
		id: 'openai',
		label: 'OpenAI',
		children: [
			{
				id: 'openai::gpt-4.1',
				label: 'GPT-4.1',
				data: {
					fullName: 'GPT-4.1',
					description: 'Fast general-purpose model for chat and agentic workflows.',
				},
			},
			{
				id: 'openai::gpt-4.1-mini',
				label: 'GPT-4.1 mini',
				data: { fullName: 'GPT-4.1 mini' },
			},
		],
	},
	{
		id: 'anthropic',
		label: 'Anthropic',
		children: [
			{
				id: 'anthropic::claude-sonnet',
				label: 'Claude Sonnet 4',
				data: { fullName: 'Claude Sonnet 4' },
			},
		],
	},
];

const meta: Meta<typeof N8nAiModelSelectorDropdown> = {
	title: 'AI/AiModelSelectorDropdown',
	component: N8nAiModelSelectorDropdown,
	parameters: {
		docs: {
			description: {
				component:
					'A reusable dropdown shell for AI model selectors. Product features provide model data, leading icons, search behavior, and selection handling.',
			},
		},
	},
	render: (args) => ({
		components: { N8nAiModelSelectorDropdown },
		setup: () => {
			const getProviderId = (id: string) => id.split('::')[0];
			const getProviderLogo = (id: string) => `https://models.dev/logos/${getProviderId(id)}.svg`;

			return { args, getProviderLogo };
		},
		template: `
			<N8nAiModelSelectorDropdown v-bind="args">
				<template #trigger-leading="{ ui }">
					<img
						:class="ui.class"
						src="https://models.dev/logos/openai.svg"
						alt="OpenAI"
						style="width: 20px; height: 20px; border-radius: 999px;"
					/>
				</template>
				<template #item-leading="{ item, ui }">
					<img
						:class="ui.class"
						:src="getProviderLogo(item.id)"
						alt=""
						style="width: 20px; height: 20px; border-radius: 999px;"
					/>
				</template>
			</N8nAiModelSelectorDropdown>
		`,
	}),
};

export default meta;

type Story = StoryObj<typeof N8nAiModelSelectorDropdown>;

export const Default: Story = {
	args: {
		items,
		selectedLabel: 'GPT-4.1',
		selectedCredentialName: 'Production OpenAI credential',
		credentialsMissingLabel: 'Credentials missing',
		noMatchLabel: 'No models found',
		dataTestId: 'ai-model-selector',
		credentialDataTestId: 'ai-model-selector-credential',
		maxSelectedNameChars: 30,
	},
};

export const MissingCredentials: Story = {
	args: {
		...Default.args,
		selectedLabel: 'Claude Sonnet 4',
		selectedCredentialName: undefined,
		credentialsMissing: true,
	},
};
