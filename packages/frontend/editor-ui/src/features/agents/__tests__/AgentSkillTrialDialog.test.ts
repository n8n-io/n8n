import { createTestingPinia } from '@pinia/testing';
import type { SkillCatalogItem, SkillTrialPreview } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import AgentSkillTrialDialog from '../components/AgentSkillTrialDialog.vue';
import { prepareSkillTrial, runSkillTrial } from '../composables/useSkillTrialApi';

vi.mock('../composables/useSkillTrialApi', () => ({
	prepareSkillTrial: vi.fn(),
	runSkillTrial: vi.fn(),
}));
vi.mock('../composables/useAgentModelCredentials', () => ({
	useAgentModelCredentials: () => ({
		credentialsByProvider: { value: { openai: 'openai-1', anthropic: 'anthropic-1' } },
		selectCredential: vi.fn(),
	}),
}));
vi.mock('../composables/useModelCatalog', () => ({
	useModelCatalog: () => ({
		ensureLoaded: vi.fn(),
		getModelsForPicker: () => ({ openai: { models: [] }, anthropic: { models: [] } }),
		isLoading: { value: false },
	}),
}));
vi.mock('../components/AgentModelSelector.vue', () => ({
	default: {
		emits: ['change'],
		template: `<button @click="$emit('change', {provider:'anthropic', model:'claude-sonnet-4-5'})">Choose Anthropic</button>`,
	},
}));
vi.mock('../components/modals/AgentModal.vue', () => ({
	default: {
		template: '<div><slot /><slot name="footerBeforeCancel" /><slot name="footerActions" /></div>',
	},
}));

const item: SkillCatalogItem = {
	id: 'acme/skills/writing',
	name: 'writing',
	slug: 'writing',
	source: 'acme/skills',
	installs: 5,
	githubUrl: 'https://github.com/acme/skills',
	catalogUrl: 'https://skills.sh/acme/skills/writing',
};
const preview: SkillTrialPreview = {
	skill: { name: 'writing', description: 'Write clear messages', instructions: 'Be concise.' },
	contentHash: 'a'.repeat(64),
	revision: 'commit-1',
	skippedFiles: [],
	check: { verdict: 'pass', findings: [] },
	defaultModel: { model: 'openai/gpt-5-mini', credential: 'saved-openai' },
};
const render = createComponentRenderer(AgentSkillTrialDialog, {
	props: { item, projectId: 'project-1' },
});

describe('AgentSkillTrialDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		vi.mocked(prepareSkillTrial).mockResolvedValue(preview);
		vi.mocked(runSkillTrial).mockResolvedValue({
			response: 'Welcome aboard.',
			skillLoaded: true,
			model: 'openai/gpt-5-mini',
			durationMs: 500,
		});
	});

	async function send(view: ReturnType<typeof render>, message: string) {
		await userEvent.type(view.getByTestId('skill-trial-prompt'), message);
		await userEvent.click(view.getByTestId('skill-trial-send'));
	}

	it('opens a simple chat and sends the first message with the skill attached', async () => {
		const view = render();
		await view.findByText('Skill attached');
		expect(view.getByTestId('skill-trial-prompt')).toHaveValue('');
		expect(view.queryByText('Be concise.')).not.toBeInTheDocument();
		await send(view, 'Write a welcome email');
		expect(runSkillTrial).toHaveBeenCalledWith(expect.anything(), 'project-1', {
			catalogId: item.id,
			contentHash: preview.contentHash,
			model: 'openai/gpt-5-mini',
			credential: 'saved-openai',
			message: 'Write a welcome email',
			history: [],
		});
		expect(await view.findByTestId('skill-trial-assistant-message')).toHaveTextContent(
			'Welcome aboard.',
		);
		expect(view.getByTestId('skill-trial-user-message')).toHaveTextContent('Write a welcome email');
		expect(view.getByTestId('skill-trial-prompt')).toHaveValue('');
		expect(view.emitted('save')).toBeUndefined();
	});

	it('keeps the conversation and sends its completed turns with a follow-up', async () => {
		const view = render();
		await view.findByText('Skill attached');
		await send(view, 'Write a welcome email');
		await view.findByTestId('skill-trial-assistant-message');
		vi.mocked(runSkillTrial).mockResolvedValueOnce({
			response: 'Welcome!',
			skillLoaded: true,
			model: 'openai/gpt-5-mini',
			durationMs: 300,
		});
		await userEvent.type(view.getByTestId('skill-trial-prompt'), 'Make it shorter{Enter}');
		await waitFor(() =>
			expect(view.getAllByTestId('skill-trial-assistant-message')).toHaveLength(2),
		);
		expect(runSkillTrial).toHaveBeenLastCalledWith(
			expect.anything(),
			'project-1',
			expect.objectContaining({
				message: 'Make it shorter',
				history: [
					{ role: 'user', content: 'Write a welcome email' },
					{ role: 'assistant', content: 'Welcome aboard.' },
				],
			}),
		);
		expect(view.getByText('Welcome!')).toBeInTheDocument();
	});

	it('shows the sent message and thinking state while waiting for a reply', async () => {
		let finish!: (value: Awaited<ReturnType<typeof runSkillTrial>>) => void;
		vi.mocked(runSkillTrial).mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const view = render();
		await view.findByText('Skill attached');
		await send(view, 'Hello');
		expect(view.getByTestId('skill-trial-pending-message')).toHaveTextContent('Hello');
		expect(view.getByRole('status', { name: 'Thinking…' })).toBeInTheDocument();
		expect(view.getByTestId('skill-trial-send')).toBeDisabled();
		finish({ response: 'Hi', skillLoaded: true, model: 'openai/gpt-5-mini', durationMs: 100 });
		await view.findByTestId('skill-trial-assistant-message');
		expect(view.queryByRole('status')).not.toBeInTheDocument();
	});

	it('restores a failed message for retry without losing earlier turns or duplicating them', async () => {
		const view = render();
		await view.findByText('Skill attached');
		await send(view, 'Write a welcome email');
		await view.findByTestId('skill-trial-assistant-message');
		vi.mocked(runSkillTrial).mockRejectedValueOnce(new Error('Provider unavailable'));
		await send(view, 'Make it shorter');
		expect(await view.findByTestId('skill-trial-error')).toHaveTextContent('Provider unavailable');
		expect(view.getByTestId('skill-trial-prompt')).toHaveValue('Make it shorter');
		expect(view.getAllByTestId('skill-trial-user-message')).toHaveLength(1);
		await userEvent.click(view.getByRole('button', { name: 'Retry' }));
		await waitFor(() =>
			expect(view.getAllByTestId('skill-trial-assistant-message')).toHaveLength(2),
		);
		expect(runSkillTrial).toHaveBeenLastCalledWith(
			expect.anything(),
			'project-1',
			expect.objectContaining({
				history: [
					{ role: 'user', content: 'Write a welcome email' },
					{ role: 'assistant', content: 'Welcome aboard.' },
				],
			}),
		);
	});

	it('starts a new conversation with the same attached skill and no earlier messages', async () => {
		const view = render();
		await view.findByText('Skill attached');
		await send(view, 'Hello');
		await view.findByTestId('skill-trial-assistant-message');
		await userEvent.click(view.getByRole('button', { name: 'New chat' }));
		expect(view.queryByTestId('skill-trial-assistant-message')).not.toBeInTheDocument();
		expect(view.getByText('Skill attached')).toBeInTheDocument();
		await send(view, 'New topic');
		expect(runSkillTrial).toHaveBeenLastCalledWith(
			expect.anything(),
			'project-1',
			expect.objectContaining({
				history: [],
				message: 'New topic',
				contentHash: preview.contentHash,
			}),
		);
	});

	it('keeps model selection and Save in Details', async () => {
		const view = render();
		await view.findByText('Skill attached');
		expect(view.queryByRole('button', { name: 'Save skill' })).not.toBeInTheDocument();
		await userEvent.click(view.getByRole('button', { name: 'Details' }));
		await userEvent.click(view.getByRole('button', { name: 'Choose Anthropic' }));
		await send(view, 'Hello');
		expect(runSkillTrial).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			expect.objectContaining({ model: 'anthropic/claude-sonnet-4-5', credential: 'anthropic-1' }),
		);
		await view.findByTestId('skill-trial-assistant-message');
		await userEvent.click(view.getByRole('button', { name: 'Details' }));
		await userEvent.click(view.getByRole('button', { name: 'Save skill' }));
		expect(view.emitted('save')).toEqual([[]]);
	});

	it('opens model setup only when no default is available', async () => {
		vi.mocked(prepareSkillTrial).mockResolvedValueOnce({ ...preview, defaultModel: null });
		const view = render();
		await view.findByText('Skill attached');
		await userEvent.type(view.getByTestId('skill-trial-prompt'), 'Hello');
		expect(view.getByTestId('skill-trial-send')).toBeDisabled();
		expect(view.getByText('Choose a model and credential to start chatting')).toBeInTheDocument();
		await userEvent.click(view.getByRole('button', { name: 'Choose Anthropic' }));
		expect(view.getByTestId('skill-trial-send')).toBeEnabled();
	});

	it('retries a failed GitHub read before opening chat', async () => {
		vi.mocked(prepareSkillTrial).mockRejectedValueOnce(new Error('GitHub unavailable'));
		const view = render();
		await view.findByTestId('skill-trial-error');
		await userEvent.click(view.getByRole('button', { name: 'Retry' }));
		await view.findByText('Skill attached');
		expect(runSkillTrial).not.toHaveBeenCalled();
	});
});
