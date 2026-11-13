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

	it('runs the reviewed content with the default credential and shows the result', async () => {
		const view = render();
		await view.findByTestId('skill-trial-prompt');
		await userEvent.clear(view.getByRole('textbox'));
		await userEvent.type(view.getByRole('textbox'), 'Write a welcome email');
		await userEvent.click(view.getByTestId('skill-trial-run'));
		expect(runSkillTrial).toHaveBeenCalledWith(expect.anything(), 'project-1', {
			catalogId: item.id,
			contentHash: preview.contentHash,
			model: 'openai/gpt-5-mini',
			credential: 'saved-openai',
			message: 'Write a welcome email',
		});
		expect(await view.findByTestId('skill-trial-result')).toHaveTextContent('Welcome aboard.');
		expect(view.getByTestId('skill-trial-result')).toHaveTextContent('Skill loaded');
		expect(view.emitted('save')).toBeUndefined();
	});

	it('uses the new provider credential after a model change', async () => {
		const view = render();
		await view.findByTestId('skill-trial-prompt');
		await userEvent.click(view.getByRole('button', { name: 'Choose Anthropic' }));
		await userEvent.click(view.getByTestId('skill-trial-run'));
		expect(runSkillTrial).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			expect.objectContaining({ model: 'anthropic/claude-sonnet-4-5', credential: 'anthropic-1' }),
		);
	});

	it('requires a model credential when no default is available', async () => {
		vi.mocked(prepareSkillTrial).mockResolvedValueOnce({ ...preview, defaultModel: null });
		const view = render();
		await view.findByTestId('skill-trial-prompt');
		expect(view.getByTestId('skill-trial-run')).toBeDisabled();
		expect(view.getByText('Choose a model and credential to run this test')).toBeInTheDocument();
	});

	it('shows a model error and permits another run', async () => {
		vi.mocked(runSkillTrial).mockRejectedValueOnce(new Error('Provider unavailable'));
		const view = render();
		await view.findByTestId('skill-trial-prompt');
		await userEvent.click(view.getByTestId('skill-trial-run'));
		expect(await view.findByTestId('skill-trial-error')).toHaveTextContent('Provider unavailable');
		await userEvent.click(view.getByTestId('skill-trial-run'));
		await view.findByTestId('skill-trial-result');
		expect(view.queryByTestId('skill-trial-error')).not.toBeInTheDocument();
	});

	it('offers a retry after a failed GitHub read and keeps Save separate', async () => {
		vi.mocked(prepareSkillTrial).mockRejectedValueOnce(new Error('GitHub unavailable'));
		const view = render();
		await view.findByTestId('skill-trial-error');
		await userEvent.click(view.getByRole('button', { name: 'Retry' }));
		await view.findByTestId('skill-trial-prompt');
		await userEvent.click(view.getByRole('button', { name: 'Save skill' }));
		await waitFor(() => expect(view.emitted('save')).toEqual([[]]));
		expect(runSkillTrial).not.toHaveBeenCalled();
	});
});
