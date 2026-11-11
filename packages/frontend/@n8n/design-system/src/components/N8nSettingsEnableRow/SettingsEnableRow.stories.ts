import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nPreviewBadge from '../PreviewBadge/PreviewBadge.vue';
import N8nSettingsEnableRow from './SettingsEnableRow.vue';

const meta = {
	title: 'Areas/Settings/SettingsEnableRow',
	component: N8nSettingsEnableRow,
	parameters: {
		docs: {
			description: {
				component:
					'A settings row with a switch. Use it for the enable control at the top of a settings screen. Pass a badge through the titleTrailing slot when the setting still uses a standalone badge.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsEnableRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { N8nSettingsEnableRow, N8nPreviewBadge },
		setup() {
			const agents = ref(true);
			const roles = ref(false);
			return { agents, roles };
		},
		template: `
			<div style="display: flex; flex-direction: column; max-width: 720px;">
				<N8nSettingsEnableRow
					v-model="agents"
					title="Enable Agents"
					description="Allow users to build and run agents on this instance."
				>
					<template #titleTrailing>
						<N8nPreviewBadge />
					</template>
				</N8nSettingsEnableRow>
				<N8nSettingsEnableRow
					v-model="roles"
					title="Enable roles"
					description="Let admins assign project roles to members."
				/>
			</div>
		`,
	}),
};

export const Disabled: Story = {
	args: {
		title: 'Enable Chat',
		description: 'Chat is turned off for this instance.',
		modelValue: false,
		disabled: true,
		disabledTooltip: 'Ask an instance owner to turn Chat on.',
	},
};
