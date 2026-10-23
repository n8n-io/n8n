import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nText from '../N8nText';
import N8nSettingsRowButton from './SettingsRowButton.vue';

const meta = {
	title: 'Areas/Settings/SettingsRowButton',
	component: N8nSettingsRowButton,
} satisfies Meta<typeof N8nSettingsRowButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nSettingsRowButton, N8nText },
		setup: () => ({ args }),
		template: `
			<N8nSettingsRowButton v-bind="args">
				<N8nText size="small" color="text-base">View more</N8nText>
			</N8nSettingsRowButton>
		`,
	}),
};
