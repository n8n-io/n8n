import { fireEvent, render } from '@testing-library/vue';
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

	it('renders the settings-sized switch on both default branches', () => {
		const plain = render(N8nSettingsEnableRow, {
			props: { title: 'Enable Agents', modelValue: false, switchTestId: 'enable-agents' },
		});

		expect(plain.getByRole('switch').parentElement?.className).toContain('large');
		expect(plain.getByTestId('enable-agents')).toBe(plain.getByRole('switch'));
		plain.unmount();

		const locked = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				modelValue: false,
				disabled: true,
				disabledTooltip: 'An admin locked this setting.',
			},
		});

		expect(locked.getByRole('switch').parentElement?.className).toContain('large');
	});

	it('emits the next switch value', async () => {
		const { getByRole, emitted } = render(N8nSettingsEnableRow, {
			props: { title: 'Enable Agents', modelValue: false },
		});

		await userEvent.click(getByRole('switch', { name: 'Enable Agents' }));

		expect(emitted()['update:modelValue'][0]).toEqual([true]);
	});

	it('toggles the switch from the title and the description, and ignores badges', async () => {
		const Page = defineComponent({
			components: { N8nSettingsEnableRow },
			setup() {
				const enabled = ref(false);
				return { enabled };
			},
			template: `
				<N8nSettingsEnableRow
					v-model="enabled"
					title="Enable Agents"
					description="Allow users to build and run agents."
					feature="agents"
					show-badges
					disabled-tooltip="You cannot change this."
				/>
			`,
		});

		const { getByRole, getByText, getByTestId } = render(Page);
		const enableSwitch = getByRole('switch', { name: 'Enable Agents' });

		expect(getByText('Enable Agents').closest('label')).toHaveAttribute('for', enableSwitch.id);
		expect(getByText('Allow users to build and run agents.').closest('label')).toHaveAttribute(
			'for',
			enableSwitch.id,
		);
		expect(getByTestId('agents-preview-badge').closest('label')).toBeNull();

		// fireEvent uses the label's native activation. user-event cannot click these labels in jsdom.
		await fireEvent.click(getByText('Enable Agents'));
		expect(enableSwitch).toHaveAttribute('aria-checked', 'true');

		await fireEvent.click(getByText('Allow users to build and run agents.'));
		expect(enableSwitch).toHaveAttribute('aria-checked', 'false');

		await fireEvent.click(getByTestId('agents-preview-badge'));
		expect(enableSwitch).toHaveAttribute('aria-checked', 'false');
	});

	it('does not toggle from the title or the description when the switch is disabled', async () => {
		const { getByRole, getByText, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				modelValue: false,
				disabled: true,
				disabledTooltip: 'You cannot change this.',
			},
		});

		await fireEvent.click(getByText('Enable Agents'));
		await fireEvent.click(getByText('Allow users to build and run agents.'));

		expect(getByRole('switch', { name: 'Enable Agents' })).toHaveAttribute('aria-checked', 'false');
		expect(emitted()['update:modelValue']).toBeUndefined();
	});

	it('keeps the title as plain text when the action slot replaces the switch', () => {
		const { getByText, queryByRole } = render(N8nSettingsEnableRow, {
			props: { title: 'Enable Assistant', description: 'Help people build.' },
			slots: { action: '<button type="button">Enable</button>' },
		});

		expect(queryByRole('switch')).not.toBeInTheDocument();
		expect(getByText('Enable Assistant').closest('label')).toBeNull();
		expect(getByText('Help people build.').closest('label')).toBeNull();
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
