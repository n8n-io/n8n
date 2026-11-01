import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';

import { N8nTabsContent, N8nTabsList, N8nTabsRoot, N8nTabsTrigger } from './index';

const TabsExample = defineComponent({
	components: { N8nTabsRoot, N8nTabsList, N8nTabsTrigger, N8nTabsContent },
	setup() {
		const value = ref('overview');
		return { value };
	},
	template: `
		<N8nTabsRoot v-model="value">
			<N8nTabsList aria-label="Example tabs">
				<N8nTabsTrigger value="overview">Overview</N8nTabsTrigger>
				<N8nTabsTrigger value="settings">Settings</N8nTabsTrigger>
			</N8nTabsList>
			<N8nTabsContent value="overview">Overview content</N8nTabsContent>
			<N8nTabsContent value="settings">Settings content</N8nTabsContent>
		</N8nTabsRoot>
	`,
});

describe('N8nTabsRoot', () => {
	it('selects a tab and shows its content', async () => {
		const user = userEvent.setup();
		const { getByRole, getByText, queryByText } = render(TabsExample);

		expect(getByText('Overview content')).toBeInTheDocument();
		expect(queryByText('Settings content')).not.toBeInTheDocument();
		expect(getByRole('tab', { name: 'Overview' })).toHaveAttribute('data-state', 'active');

		await user.click(getByRole('tab', { name: 'Settings' }));

		expect(getByText('Settings content')).toBeInTheDocument();
		expect(queryByText('Overview content')).not.toBeInTheDocument();
		expect(getByRole('tab', { name: 'Settings' })).toHaveAttribute('data-state', 'active');
	});

	it('moves focus between tabs with the arrow keys', async () => {
		const user = userEvent.setup();
		const { getByRole } = render(TabsExample);

		const overview = getByRole('tab', { name: 'Overview' });
		const settings = getByRole('tab', { name: 'Settings' });

		overview.focus();
		await user.keyboard('{ArrowRight}');

		expect(settings).toHaveFocus();
		expect(settings).toHaveAttribute('data-state', 'active');
	});
});
