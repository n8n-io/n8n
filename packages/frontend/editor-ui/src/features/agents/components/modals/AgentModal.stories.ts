import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { N8nButton, N8nFormInput, N8nIcon, N8nText } from '@n8n/design-system';
import { ref } from 'vue';

import AgentModal from './AgentModal.vue';
import AgentModalMultiStep from './AgentModalMultiStep.vue';

const meta = {
	title: 'Agents/AgentModal',
	component: AgentModal,
	parameters: {
		docs: {
			description: {
				component:
					'Canonical modal shell for Agent configuration. It provides an editable title, header Back and Close actions, a fixed footer, and responsive body scrolling.',
			},
		},
	},
} satisfies Meta<typeof AgentModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Configuration: Story = {
	render: () => ({
		components: { AgentModal, N8nButton, N8nFormInput, N8nIcon },
		setup() {
			const open = ref(false);
			const title = ref('New schedule');
			return { open, title };
		},
		template: `
			<N8nButton label="Open modal" @click="open = true" />
			<AgentModal v-model:open="open" v-model:title="title" editable-title>
				<N8nFormInput
					model-value=""
					label="Objective"
					placeholder="Tell the agent what to do"
				/>
				<template #footerLeft>
					<N8nButton variant="subtle">
						<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
						Remove schedule
					</N8nButton>
				</template>
				<template #footerActions>
					<N8nButton variant="solid" label="Save" @click="open = false" />
				</template>
			</AgentModal>
		`,
	}),
};

export const MultiStep: Story = {
	render: () => ({
		components: { AgentModalMultiStep, N8nButton, N8nFormInput, N8nText },
		setup() {
			const open = ref(false);
			const step = ref<'select' | 'configure'>('select');
			const title = ref('Add tool');
			function configure() {
				step.value = 'configure';
				title.value = 'HTTP Request';
			}
			function back() {
				step.value = 'select';
				title.value = 'Add tool';
			}
			return { open, step, title, configure, back };
		},
		template: `
			<N8nButton label="Open multi-step modal" @click="open = true" />
			<AgentModalMultiStep
				v-model:open="open"
				v-model:title="title"
				:step="step"
				:editable-title="step === 'configure'"
				:show-back="step === 'configure'"
				:show-footer="step === 'configure'"
				@back="back"
			>
				<div v-show="step === 'select'" style="display: flex; flex-direction: column; gap: var(--spacing--sm);">
					<N8nText>Select a tool to configure.</N8nText>
					<N8nButton variant="subtle" label="Add tool" @click="configure" />
				</div>
				<N8nFormInput
					v-if="step === 'configure'"
					model-value=""
					label="URL"
					placeholder="https://example.com"
				/>
				<template #footerActions>
					<N8nButton variant="solid" label="Save" @click="open = false" />
				</template>
			</AgentModalMultiStep>
		`,
	}),
};
