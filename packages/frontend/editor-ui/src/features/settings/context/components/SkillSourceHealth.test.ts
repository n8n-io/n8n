import type { SkillSourceHealth } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import SkillSourceHealthBadge from './SkillSourceHealth.vue';

const render = createComponentRenderer(SkillSourceHealthBadge);

describe('SkillSourceHealth', () => {
	beforeEach(() => createTestingPinia());

	it.each<{ health: SkillSourceHealth; label: string; description: string }>([
		{ health: 'connected', label: 'Connected', description: 'Not checked yet.' },
		{
			health: 'credential_issue',
			label: 'Credential issue',
			description: "n8n can't use this source's credential.",
		},
		{
			health: 'source_unavailable',
			label: 'Source unavailable',
			description:
				"The repository or branch is missing, or n8n doesn't have access. Your skills keep their last accepted version.",
		},
		{
			health: 'unreachable',
			label: 'Unreachable',
			description: "n8n couldn't reach this source. Your skills keep their last accepted version.",
		},
		{
			health: 'delayed',
			label: 'Delayed',
			description: 'GitHub has limited requests. n8n will check again later.',
		},
		{
			health: 'check_failed',
			label: 'Check failed',
			description:
				"n8n couldn't complete the update check. Your skills keep their last accepted version.",
		},
	])('shows $health with keyboard-accessible details', async ({ health, label, description }) => {
		const { getByRole } = render({ props: { source: { health, lastCheckedAt: null } } });

		await userEvent.tab();

		expect(getByRole('button', { name: label })).toHaveFocus();
		expect(await screen.findByTestId('tooltip-content')).toHaveTextContent(description);
		expect(getByRole('button', { name: label })).toHaveAccessibleDescription(
			expect.stringContaining('n8n checks every hour by default.'),
		);
	});

	it('shows the time of the last check', async () => {
		const lastCheckedAt = '2026-10-01T12:30:00.000Z';
		const { getByRole } = render({ props: { source: { health: 'connected', lastCheckedAt } } });

		await userEvent.tab();

		expect(await screen.findByTestId('tooltip-content')).toHaveTextContent(
			'Last check: Oct 1, 2026',
		);
		expect(getByRole('button', { name: 'Connected' })).toHaveAccessibleDescription(
			expect.stringContaining('Last check: Oct 1, 2026'),
		);
	});
});
