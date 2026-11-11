import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nSettingsEnableRow from './SettingsEnableRow.vue';

const meta = {
	title: 'Areas/Settings/SettingsEnableRow',
	component: N8nSettingsEnableRow,
	parameters: {
		docs: {
			description: {
				component:
					'A settings row with a switch. Use it for the enable control at the top of a settings screen. Set `showPreviewBadge` and `showEnterpriseReadinessBadge` to show the Preview badge and the Limited enterprise support badge beside the title. A later change replaces these two flags with a feature id. A FeatureBadge component then reads the feature status from a central list.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsEnableRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { N8nSettingsEnableRow },
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
					show-preview-badge
				/>
				<N8nSettingsEnableRow
					v-model="roles"
					title="Enable roles"
					description="Let admins assign project roles to members."
					show-preview-badge
					show-enterprise-readiness-badge
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
	},
};
