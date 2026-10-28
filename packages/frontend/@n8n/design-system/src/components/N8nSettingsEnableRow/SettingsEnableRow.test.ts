import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { computed, defineComponent, ref } from 'vue';

import { EnterprisePlanKey } from '../FeatureMaturityBadges/featureMaturityState';
import N8nSettingsEnableRow from './SettingsEnableRow.vue';
import N8nSettingsPageHeader from '../N8nSettingsPageHeader/SettingsPageHeader.vue';

const enterprisePlan = {
	global: {
		provide: {
			[EnterprisePlanKey as symbol]: computed(() => true),
		},
	},
};

describe('N8nSettingsEnableRow', () => {
	it('renders the title, the switch, and the feature badges', () => {
		const { getByRole, getByTestId, queryByTestId } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				feature: 'agents',
				showBadges: true,
				modelValue: false,
			},
		});

		expect(getByRole('switch', { name: 'Enable Agents' })).toHaveAttribute('aria-checked', 'false');
		expect(getByTestId('agents-preview-badge')).toHaveTextContent('Preview');
		expect(queryByTestId('agents-enterprise-readiness-badge')).not.toBeInTheDocument();
	});

	it('emits the next switch value', async () => {
		const { getByRole, emitted } = render(N8nSettingsEnableRow, {
			props: { title: 'Enable Agents', modelValue: false },
		});

		await userEvent.click(getByRole('switch', { name: 'Enable Agents' }));

		expect(emitted()['update:modelValue'][0]).toEqual([true]);
	});

	it('renders badges only on the part that sets showBadges', () => {
		const Page = defineComponent({
			components: { N8nSettingsPageHeader, N8nSettingsEnableRow },
			setup() {
				const enabled = ref(true);
				return { enabled };
			},
			template: `
				<N8nSettingsPageHeader title="Assistant" feature="assistant" :show-docs-link="false" />
				<N8nSettingsEnableRow
					v-model="enabled"
					feature="assistant"
					show-badges
					title="Enable Assistant"
				/>
			`,
		});

		const { getAllByTestId, getByRole } = render(Page, enterprisePlan);

		const badges = getAllByTestId('n8n-agent-enterprise-readiness-badge');
		expect(badges).toHaveLength(1);
		expect(getByRole('heading', { name: 'Assistant' })).not.toContainElement(badges[0]!);
	});
});
