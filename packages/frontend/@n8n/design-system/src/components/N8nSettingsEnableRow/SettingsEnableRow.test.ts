import { fireEvent, render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import {
	FeatureMaturityKey,
	type FeatureMaturityCatalog,
} from '../N8nFeatureMaturityBadges/featureMaturityState';
import N8nSettingsEnableRow from './SettingsEnableRow.vue';

const featureMaturity: FeatureMaturityCatalog = {
	workflowReviews: { preview: true, limitedEnterpriseSupport: false },
	assistant: { preview: false, limitedEnterpriseSupport: true },
	agents: { preview: true, limitedEnterpriseSupport: true },
};

const featureList = {
	global: { provide: { [FeatureMaturityKey as symbol]: featureMaturity } },
};

describe('N8nSettingsEnableRow', () => {
	it('renders the title and the switch', () => {
		const { getByRole } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		expect(getByRole('switch', { name: 'Enable Agents' })).toHaveAttribute('aria-checked', 'false');
	});

	it('emits the next switch value', async () => {
		const { getByRole, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		await userEvent.click(getByRole('switch', { name: 'Enable Agents' }));

		expect(emitted()['update:enabled'][0]).toEqual([true]);
	});

	it('shows the badges listed for the feature', () => {
		const { getByTestId } = render(N8nSettingsEnableRow, {
			...featureList,
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: true,
				feature: 'agents',
			},
		});

		expect(getByTestId('agents-preview-badge')).toHaveTextContent('Preview');
		expect(getByTestId('agents-enterprise-readiness-badge')).toHaveTextContent(
			'Limited enterprise readiness',
		);
	});

	it('hides one badge when the row asks', () => {
		const { getByTestId, queryByTestId } = render(N8nSettingsEnableRow, {
			...featureList,
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				feature: 'agents',
				hideEnterprise: true,
			},
		});

		expect(getByTestId('agents-preview-badge')).toBeInTheDocument();
		expect(queryByTestId('agents-enterprise-readiness-badge')).not.toBeInTheDocument();
	});

	it('hides the badges by default', () => {
		const { queryByText } = render(N8nSettingsEnableRow, {
			...featureList,
			props: {
				title: 'Enable workflow reviews',
				description: 'Allow users to submit workflow versions for approval.',
				enabled: true,
			},
		});

		expect(queryByText('Preview')).not.toBeInTheDocument();
		expect(queryByText('Limited enterprise readiness')).not.toBeInTheDocument();
	});

	it('uses the small settings switch', () => {
		const { getByRole } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		expect(getByRole('switch', { name: 'Enable Agents' }).parentElement?.className).toContain(
			'small',
		);
	});

	it('toggles the switch from the title', async () => {
		const { getByText, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		// user-event crashes when a label click activates the switch.
		await fireEvent.click(getByText('Enable Agents'));

		expect(emitted()['update:enabled'][0]).toEqual([true]);
	});

	it('toggles the switch from the description', async () => {
		const { getByText, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		await fireEvent.click(getByText('Allow users to build and run agents.'));

		expect(emitted()['update:enabled'][0]).toEqual([true]);
	});

	it('does not toggle from the title when the switch is disabled', async () => {
		const { getByText, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
				disabled: true,
			},
		});

		await fireEvent.click(getByText('Enable Agents'));

		expect(emitted()['update:enabled']).toBeUndefined();
	});

	it('does not toggle from a feature badge', async () => {
		const { getByTestId, emitted } = render(N8nSettingsEnableRow, {
			...featureList,
			props: {
				title: 'Enable workflow reviews',
				description: 'Allow users to submit workflow versions for approval.',
				enabled: false,
				feature: 'workflowReviews',
			},
		});

		await userEvent.click(getByTestId('workflow-reviews-preview-badge'));

		expect(emitted()['update:enabled']).toBeUndefined();
	});

	it('renders a divider and leaves the card to the page', () => {
		const { getByTestId, queryByTestId } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
			},
		});

		expect(queryByTestId('settings-row-group')).not.toBeInTheDocument();
		expect(getByTestId('settings-row-divider')).toBeInTheDocument();
	});
});
