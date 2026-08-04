import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nSettingsRowConfigure from './SettingsRowConfigure.vue';

const meta = {
	title: 'Instance Settings/Settings Row Configure',
	component: N8nSettingsRowConfigure,
	argTypes: {
		value: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'The always-visible affordance for a whole-row-clickable `N8nSettingsRow`: a single text plus a trailing right chevron. It shows "Configure" when not configured, or the configured-state free text once set up. Drop it into the row `#action` slot — it is presentational only, the parent row owns the click/keyboard behaviour.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsRowConfigure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const Configured: Story = {
	args: {
		value: '2 of 3 devices',
	},
};
