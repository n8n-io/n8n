import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS } from '@/app/constants/localStorage';

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

async function clickUse(getByTestId: (id: string) => HTMLElement, id: string) {
	await userEvent.click(
		within(getByTestId(`recommended-skill-${id}`)).getByTestId('recommended-skill-use-button'),
	);
}

describe('RecommendedSkillCards', () => {
	beforeEach(() => {
		track.mockReset();
		showError.mockReset();
		localStorage.clear();
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

	it.each([
		['humanizer', 'blader/humanizer', 'https://github.com/blader/humanizer'],
		[
			'cold-email',
			'coreyhaines31/marketingskills',
			'https://github.com/coreyhaines31/marketingskills/tree/main/skills/cold-email',
		],
		[
			'research',
			'mattpocock/skills',
			'https://github.com/mattpocock/skills/tree/main/skills/engineering/research',
		],
	])('links the %s card to its source', (id, label, url) => {
		const { getByTestId } = renderComponent({ pinia });
		const card = within(getByTestId(`recommended-skill-${id}`));

		expect(card.getByTestId('recommended-skill-source')).toHaveTextContent(`Based on ${label}`);
		const link = card.getByTestId('recommended-skill-source-link');
		expect(link).toHaveAttribute('href', url);
		expect(link).toHaveAttribute('target', '_blank');
	});

	it('labels the added skills in the dialog and keeps their button working', async () => {
		localStorage.setItem(LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS, JSON.stringify(['research']));
		const { getByTestId, getAllByTestId, emitted } = renderComponent({
			pinia,
			props: { entryPoint: 'create_menu' },
		});

		expect(getAllByTestId('recommended-skill-added')).toHaveLength(1);
		expect(
			within(getByTestId('recommended-skill-research')).getByTestId('recommended-skill-added'),
		).toHaveTextContent('Added');
		expect(within(getByTestId('recommended-skill-research')).getByText('Select')).toBeVisible();

		await clickUse(getByTestId, 'research');

		await waitFor(() => expect(emitted('select')).toHaveLength(1));
	});

	it('shows no added label on the empty state', () => {
		localStorage.setItem(LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS, JSON.stringify(['research']));
		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('recommended-skill-added')).not.toBeInTheDocument();
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

		await clickUse(getByTestId, 'cold-email');

		await waitFor(() => expect(emitted('select')).toHaveLength(1));
		const [[selected]] =
			emitted<[{ id: string; skill: { name: string; references?: unknown[] } }]>('select');
		expect(selected.id).toBe('cold-email');
		expect(selected.skill.name).toBe('cold-email');
		expect(selected.skill.references).toHaveLength(4);
	});

	it('loads one skill at a time', async () => {
		const humanizer = RECOMMENDED_SKILLS.find(({ id }) => id === 'humanizer')!;
		const research = RECOMMENDED_SKILLS.find(({ id }) => id === 'research')!;
		const pending = Promise.withResolvers<Awaited<ReturnType<typeof humanizer.load>>>();
		const { getByTestId, emitted } = renderComponent({ pinia });
		const loaded = await humanizer.load();
		vi.spyOn(humanizer, 'load').mockReturnValueOnce(pending.promise);
		const researchLoad = vi.spyOn(research, 'load');

		await clickUse(getByTestId, 'humanizer');
		await clickUse(getByTestId, 'research');
		pending.resolve(loaded);

		await waitFor(() => expect(emitted('select')).toHaveLength(1));
		expect(emitted<[{ id: string }]>('select')[0][0].id).toBe('humanizer');
		expect(researchLoad).not.toHaveBeenCalled();
	});

	it('shows an error and emits nothing when the skill content does not load', async () => {
		const error = new Error('Failed to fetch dynamically imported module');
		const research = RECOMMENDED_SKILLS.find(({ id }) => id === 'research')!;
		const { getByTestId, emitted } = renderComponent({ pinia });
		vi.spyOn(research, 'load').mockRejectedValueOnce(error);

		await clickUse(getByTestId, 'research');

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(
				error,
				"Couldn't load the skill. Reload the page and try again.",
			),
		);
		expect(emitted('select')).toBeUndefined();

		await clickUse(getByTestId, 'research');
		await waitFor(() => expect(emitted('select')).toHaveLength(1));
	});
});
