import { PUBLISH_JUDGE_VIOLATION_KIND, type UpdateAgentVersionDto } from '@n8n/api-types';
import { useAgentPublish } from './useAgentPublish';

const mocks = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showError: vi.fn(),
	publishAgent: vi.fn(),
	ready: true,
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mocks.showMessage, showError: mocks.showError }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));
vi.mock('./useAgentApi', () => ({
	getAgent: vi.fn().mockResolvedValue({ versionId: 'v1', name: 'Support bot' }),
	getAgentVersion: vi.fn().mockResolvedValue({ name: 'v1', description: '' }),
	publishAgent: mocks.publishAgent,
	revertAgentToPublished: vi.fn(),
	unpublishAgent: vi.fn(),
}));
vi.mock('./useAgentVersionMetadataModal', () => ({
	useAgentVersionMetadataModal: () => ({
		openVersionMetadata: async ({
			onSubmit,
		}: {
			onSubmit: (metadata: UpdateAgentVersionDto) => Promise<boolean>;
		}) => await onSubmit({ name: 'v1', description: '' } as UpdateAgentVersionDto),
	}),
}));
vi.mock('./useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal: vi.fn() }),
}));
vi.mock('./useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackRevertedChangesOnAgent: vi.fn() }),
}));
vi.mock('./useProjectAgentsList', () => ({ upsertProjectAgentsListCache: vi.fn() }));
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => ({ value: mocks.ready }),
}));
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', async (importOriginal) => ({
	...(await importOriginal<
		typeof import('@/features/ai/instanceAi/composables/useInstanceAiHandoff')
	>()),
	useInstanceAiHandoff: () => ({ startThread: vi.fn() }),
}));

const judgeDenied = {
	meta: {
		violations: [
			{
				kind: PUBLISH_JUDGE_VIOLATION_KIND.denied,
				checkId: 'publish-judge',
				message: 'The agent can email customers without review.',
			},
		],
	},
};

describe('useAgentPublish', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.ready = true;
	});

	it('shows a sticky error toast, not an error dialog, for a judge refusal', async () => {
		mocks.publishAgent.mockRejectedValue(judgeDenied);

		await useAgentPublish().publish('project-1', 'agent-1');

		expect(mocks.showError).not.toHaveBeenCalled();
		expect(mocks.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'error', duration: 0 }),
		);
	});

	it('falls back to showError for a judge refusal when the Assistant is not ready', async () => {
		mocks.ready = false;
		mocks.publishAgent.mockRejectedValue(judgeDenied);

		await useAgentPublish().publish('project-1', 'agent-1');

		expect(mocks.showError).toHaveBeenCalledTimes(1);
		expect(mocks.showMessage).not.toHaveBeenCalled();
	});

	it('uses showError for an error without judge violations', async () => {
		const error = new Error('Boom');
		mocks.publishAgent.mockRejectedValue(error);

		await useAgentPublish().publish('project-1', 'agent-1');

		expect(mocks.showError).toHaveBeenCalledWith(error, expect.any(String));
		expect(mocks.showMessage).not.toHaveBeenCalled();
	});
});
