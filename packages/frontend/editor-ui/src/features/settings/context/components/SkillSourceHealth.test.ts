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
		{ health: 'connected', label: 'Source health', description: 'Not checked yet.' },
		{
			health: 'credential_issue',
			label: 'Credential expired',
			description: "n8n can't use this source's credential.",
		},
		{
			health: 'source_unavailable',
			label: 'Source unavailable',
			description:
				"n8n can't find or access part of this source. Your skills keep their last accepted version.",
		},
		{
			health: 'unreachable',
			label: 'Source unavailable',
			description: "n8n couldn't reach this source. Your skills keep their last accepted version.",
		},
		{
			health: 'delayed',
			label: 'Checking delayed',
			description: 'GitHub has limited requests. n8n will check again later.',
		},
		{
			health: 'check_failed',
			label: 'Source unavailable',
			description:
				"n8n couldn't complete the update check. Your skills keep their last accepted version.",
		},
	])('shows $health with keyboard-accessible details', async ({ health, label, description }) => {
		const { getByRole } = render({ props: { source: { health, lastCheckedAt: null } } });

		await userEvent.tab();

		expect(getByRole('button', { name: label })).toHaveFocus();
		expect(await screen.findByTestId('tooltip-content')).toHaveTextContent(description);
		expect(getByRole('button', { name: label })).toHaveAccessibleDescription(
			expect.stringContaining('n8n checks this source every hour'),
		);
	});

	it('shows the time of the last check', async () => {
		const lastCheckedAt = '2026-10-01T12:30:00.000Z';
		const { getByRole } = render({ props: { source: { health: 'connected', lastCheckedAt } } });

		await userEvent.tab();

		expect(await screen.findByTestId('tooltip-content')).toHaveTextContent(
			'Last check: Oct 1, 2026',
		);
		expect(getByRole('button', { name: 'Source health' })).toHaveAccessibleDescription(
			expect.stringContaining('Last check: Oct 1, 2026'),
		);
	});
	it('shows missing folders in the tooltip', async () => {
		render({
			props: {
				source: {
					health: 'source_unavailable',
					lastCheckedAt: null,
					missingSkills: ['pdf', 'docx'],
				},
			},
		});
		await userEvent.tab();
		expect(await screen.findByTestId('tooltip-content')).toHaveTextContent(
			'Missing skill folders: pdf, docx',
		);
	});

	it('shows a tooltip control without a healthy badge', () => {
		const { queryByText, getByRole } = render({
			props: { source: { health: 'connected', lastCheckedAt: null } },
		});
		expect(queryByText('Connected')).toBeNull();
		expect(getByRole('button', { name: 'Source health' })).toBeInTheDocument();
	});
});
