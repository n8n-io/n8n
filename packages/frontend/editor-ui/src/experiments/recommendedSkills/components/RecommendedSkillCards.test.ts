import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RECOMMENDED_SKILLS } from '../recommendedSkills';
import RecommendedSkillCards from './RecommendedSkillCards.vue';

const track = vi.fn();
const showError = vi.fn();

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

const renderComponent = createComponentRenderer(RecommendedSkillCards, {
	props: { entryPoint: 'empty_state' },
});

let pinia: ReturnType<typeof createTestingPinia>;

describe('RecommendedSkillCards', () => {
	beforeEach(() => {
		track.mockReset();
		showError.mockReset();
		pinia = createTestingPinia();
	});

	it('shows the three recommended skills with their card text', () => {
		const { getAllByTestId, getByTestId } = renderComponent({ pinia });

		expect(getAllByTestId('recommended-skill-use-button')).toHaveLength(3);
		expect(within(getByTestId('recommended-skill-humanizer')).getByText('humanizer')).toBeVisible();
		expect(
			within(getByTestId('recommended-skill-cold-email')).getByText('cold-email'),
		).toBeVisible();
		expect(
			within(getByTestId('recommended-skill-research')).getByText(
				/needs a web search tool or an HTTP Request tool/,
			),
		).toBeVisible();
	});

	it('reports the cards shown once, with the entry point', () => {
		renderComponent({ pinia, props: { entryPoint: 'create_menu' } });

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_VIEWED_RECOMMENDED_SKILLS,
			expect.objectContaining({ entry_point: 'create_menu' }),
		);
	});

	it('emits the selected skill with its content and reference files', async () => {
		const { getByTestId, emitted } = renderComponent({ pinia });

		await userEvent.click(
			within(getByTestId('recommended-skill-cold-email')).getByTestId(
				'recommended-skill-use-button',
			),
		);

		await waitFor(() => expect(emitted('select')).toHaveLength(1));
		const [[selected]] =
			emitted<[{ id: string; skill: { name: string; references?: unknown[] } }]>('select');
		expect(selected.id).toBe('cold-email');
		expect(selected.skill.name).toBe('cold-email');
		expect(selected.skill.references).toHaveLength(4);
	});

	it('shows an error and emits nothing when the skill content does not load', async () => {
		const error = new Error('Failed to fetch dynamically imported module');
		const research = RECOMMENDED_SKILLS.find(({ id }) => id === 'research')!;
		const { getByTestId, emitted } = renderComponent({ pinia });
		vi.spyOn(research, 'load').mockRejectedValueOnce(error);

		await userEvent.click(
			within(getByTestId('recommended-skill-research')).getByTestId('recommended-skill-use-button'),
		);

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(
				error,
				"Couldn't load the skill. Reload the page and try again.",
			),
		);
		expect(emitted('select')).toBeUndefined();
	});
});
