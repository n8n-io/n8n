import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsEnableRow from './SettingsEnableRow.vue';

const meta = {
	title: 'Areas/Settings/SettingsEnableRow',
	component: N8nSettingsEnableRow,
	parameters: {
		docs: {
			description: {
				component:
					'A settings row with a switch. Use it for the enable control at the top of a settings screen. Set `showPreviewBadge` and `showEnterpriseReadinessBadge` to show the Preview badge and the Limited enterprise support badge beside the title.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsEnableRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const card = (inner: string) =>
	`<div style="max-width: 45rem;"><N8nSettingsRowGroup>${inner}</N8nSettingsRowGroup></div>`;

export const Default: Story = {
	args: {
		title: 'Enable Agents',
		description: 'Allow users to build and run agents on this instance.',
	},
	render: (args) => ({
		components: { N8nSettingsEnableRow, N8nSettingsRowGroup },
		setup() {
			const enabled = ref(true);
			return { args, enabled };
		},
		template: card(`
			<N8nSettingsEnableRow v-bind="args" v-model="enabled" />
		`),
	}),
};

export const WithBadges: Story = {
	name: 'With Badges',
	args: {
		title: 'With Preview',
	},
	render: () => ({
		components: { N8nSettingsEnableRow, N8nSettingsRowGroup },
		setup() {
			const preview = ref(true);
			const enterprise = ref(true);
			const both = ref(true);
			return { preview, enterprise, both };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--lg); max-width: 45rem;">
				<N8nSettingsRowGroup>
					<N8nSettingsEnableRow
						v-model="preview"
						title="With Preview"
						description="Allow users to build and run agents on this instance."
						show-preview-badge
					/>
				</N8nSettingsRowGroup>
				<N8nSettingsRowGroup>
					<N8nSettingsEnableRow
						v-model="enterprise"
						title="With Enterprise"
						description="Allow users to build and run agents on this instance."
						show-enterprise-readiness-badge
					/>
				</N8nSettingsRowGroup>
				<N8nSettingsRowGroup>
					<N8nSettingsEnableRow
						v-model="both"
						title="With Both"
						description="Allow users to build and run agents on this instance."
						show-preview-badge
						show-enterprise-readiness-badge
					/>
				</N8nSettingsRowGroup>
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
	render: (args) => ({
		components: { N8nSettingsEnableRow, N8nSettingsRowGroup },
		setup: () => ({ args }),
		template: card(`<N8nSettingsEnableRow v-bind="args" />`),
	}),
};
