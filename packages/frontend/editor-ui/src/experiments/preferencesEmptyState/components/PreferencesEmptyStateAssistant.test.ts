import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';

import PreferencesEmptyStateAssistant from './PreferencesEmptyStateAssistant.vue';

const PERSONAL_PROJECT_ID = 'personal-project';
const SUGGESTION_MESSAGE =
	"Look at my workflows and agents. Find up to 3 things I do the same way each time, such as the nodes and credentials I use, how I name things, or how I set up agents. Save each one as a preference just for me. Don't change my workflows or agents. If I have no workflows or agents yet, ask me 3 short questions about how I like to build, then save my answers as preferences.";

const openThreadWithDraft = vi.fn();
const ensurePersonalProjectId = vi.fn();

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	ensurePersonalProjectId: async () => await ensurePersonalProjectId(),
	useInstanceAiHandoff: () => ({ openThreadWithDraft }),
}));

const renderComponent = createComponentRenderer(PreferencesEmptyStateAssistant);

describe('PreferencesEmptyStateAssistant', () => {
	beforeEach(() => {
		createTestingPinia();
		openThreadWithDraft.mockReset();
		openThreadWithDraft.mockResolvedValue(true);
		ensurePersonalProjectId.mockReset();
		ensurePersonalProjectId.mockResolvedValue(PERSONAL_PROJECT_ID);
	});

	it('renders the three steps in order', () => {
		const { getAllByTestId } = renderComponent();

		const steps = getAllByTestId('preferences-empty-state-assistant-step');

		expect(steps).toHaveLength(3);
		expect(steps[0]).toHaveTextContent('1Reviews how you use n8n');
		expect(steps[1]).toHaveTextContent('2Suggests up to 3 preferences that you can edit');
		expect(steps[2]).toHaveTextContent(
			'3Applies them when you build with the n8n Assistant or through MCP',
		);
	});

	it('opens an n8n Assistant thread with the suggestion message as an unsent draft', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('preferences-empty-state-suggest'));

		expect(openThreadWithDraft).toHaveBeenCalledTimes(1);
		expect(openThreadWithDraft).toHaveBeenCalledWith(
			PERSONAL_PROJECT_ID,
			{ text: SUGGESTION_MESSAGE, prefillType: 'preferences_suggestion' },
			{ source: 'preferences_empty_state', origin: 'internal' },
		);
	});

	it('opens no thread when the personal project is not available', async () => {
		ensurePersonalProjectId.mockResolvedValue(null);
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('preferences-empty-state-suggest'));

		expect(openThreadWithDraft).not.toHaveBeenCalled();
	});

	it('opens one thread when the user clicks again during the hand-off', async () => {
		let finishHandoff = () => {};
		openThreadWithDraft.mockImplementation(
			async () => await new Promise<boolean>((resolve) => (finishHandoff = () => resolve(true))),
		);
		const { getByTestId } = renderComponent();
		const suggestButton = getByTestId('preferences-empty-state-suggest');

		await userEvent.click(suggestButton);
		await userEvent.click(suggestButton);
		finishHandoff();

		expect(openThreadWithDraft).toHaveBeenCalledTimes(1);
	});

	it('emits write-own from "Write your own"', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('preferences-empty-state-write-own'));

		expect(emitted('write-own')).toHaveLength(1);
	});
});
