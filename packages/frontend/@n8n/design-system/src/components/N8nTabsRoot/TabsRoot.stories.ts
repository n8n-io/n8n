import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import { N8nTabsContent, N8nTabsList, N8nTabsRoot, N8nTabsTrigger } from './index';

const meta = {
	title: 'Core/TabsRoot',
	component: N8nTabsRoot,
	parameters: {
		docs: {
			description: {
				component:
					'Headless Reka UI tabs composition. Use `N8nTabsRoot`, `N8nTabsList`, `N8nTabsTrigger`, and `N8nTabsContent` when you need tab selection and keyboard behavior without the styled `N8nTabs` bar.',
			},
		},
	},
} satisfies Meta<typeof N8nTabsRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { N8nTabsRoot, N8nTabsList, N8nTabsTrigger, N8nTabsContent },
		setup() {
			const value = ref('overview');
			return { value };
		},
		template: `
			<N8nTabsRoot v-model="value">
				<N8nTabsList aria-label="Example tabs" style="display: flex; gap: 8px;">
					<N8nTabsTrigger value="overview">Overview</N8nTabsTrigger>
					<N8nTabsTrigger value="settings">Settings</N8nTabsTrigger>
				</N8nTabsList>
				<N8nTabsContent value="overview">Overview content</N8nTabsContent>
				<N8nTabsContent value="settings">Settings content</N8nTabsContent>
			</N8nTabsRoot>
		`,
	}),
};
