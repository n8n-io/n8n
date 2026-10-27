import type { SelfHealingChatHandoff, SelfHealingChatInput } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { computed, defineComponent, getCurrentInstance, ref } from 'vue';

import { useSelfHealingChatHandoff } from '../useSelfHealingChatHandoff';

const mocks = vi.hoisted(() => ({
	startThread: vi.fn(),
	useHandoff: vi.fn(),
	getPersonalProject: vi.fn(),
	personalProject: null as { id: string } | null,
}));
const ready = ref(true);

vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => computed(() => ready.value),
}));
vi.mock('../useInstanceAiHandoff', async (importOriginal) => ({
	...(await importOriginal<typeof import('../useInstanceAiHandoff')>()),
	useInstanceAiHandoff: mocks.useHandoff,
}));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		get personalProject() {
			return mocks.personalProject;
		},
		getPersonalProject: mocks.getPersonalProject,
	}),
}));

const result: SelfHealingChatInput = {
	resultId: 'result-1',
	workflowId: 'workflow-1',
	outcome: 'needs_you',
	reviewState: 'dismissed',
	report: 'The request failed. Check the connection settings.',
	execution: { status: 'available', id: 'execution-1' },
};

function createHandoff() {
	let handoff: SelfHealingChatHandoff | undefined;
	createComponentRenderer(
		defineComponent({
			setup() {
				handoff = useSelfHealingChatHandoff();
				return () => null;
			},
		}),
	)();
	if (!handoff) throw new Error('The handoff was not initialized.');
	return handoff;
}

beforeEach(() => {
	vi.resetAllMocks();
	ready.value = true;
	mocks.personalProject = { id: 'personal-project' };
	mocks.useHandoff.mockImplementation(() => {
		expect(getCurrentInstance()).not.toBeNull();
		return { startThread: mocks.startThread };
	});
});

it('resolves the chat project to the personal project, loading it on first use', async () => {
	mocks.personalProject = null;
	mocks.getPersonalProject.mockImplementation(async () => {
		mocks.personalProject = { id: 'personal-project' };
	});

	await expect(createHandoff().resolveProjectId()).resolves.toBe('personal-project');
	expect(mocks.getPersonalProject).toHaveBeenCalledOnce();
});

it('returns no chat project when the personal project cannot load', async () => {
	mocks.personalProject = null;
	mocks.getPersonalProject.mockRejectedValue(new Error('Offline'));

	await expect(createHandoff().resolveProjectId()).resolves.toBeNull();
});

it('starts the normal chat handoff with the full report and execution attachment', async () => {
	mocks.startThread.mockResolvedValue('started');
	const handoff = createHandoff();
	await expect(handoff.start('personal-project', result)).resolves.toBe('started');

	expect(mocks.startThread).toHaveBeenCalledExactlyOnceWith(
		'personal-project',
		`Continue from this investigation report. Help me resolve the remaining issues.\n\n${result.report}`,
		{ kind: 'prefill', prefillType: 'handoff_self_healing_report' },
		{
			source: 'self_healing_result',
			origin: 'internal',
			sourceContext: { resultId: 'result-1', outcome: 'needs_you' },
		},
		[{ type: 'workflow', id: 'workflow-1', executionId: 'execution-1' }],
	);
});

it('tells the Assistant that the suggested changes are applied without a publication state', async () => {
	await createHandoff().start('personal-project', { ...result, reviewState: 'applied' });

	const message = mocks.startThread.mock.calls[0]?.[1];
	expect(message).toBe(
		`Continue from this investigation report. Help me resolve the remaining issues.\n\nThe suggested changes have already been applied to the workflow.\n\n${result.report}`,
	);
	expect(message).not.toMatch(/publish/i);
});

it('omits an unavailable execution from the workflow attachment', async () => {
	await createHandoff().start('personal-project', {
		...result,
		execution: { status: 'unavailable' },
	});

	expect(mocks.startThread.mock.calls[0]?.[4]).toEqual([{ type: 'workflow', id: 'workflow-1' }]);
});

it.each([
	{ handoff: 'busy', outcome: 'busy' },
	{ handoff: 'failed', outcome: 'failed' },
	{ handoff: 'setup', outcome: 'unavailable' },
] as const)('reports a $handoff handoff as $outcome', async ({ handoff, outcome }) => {
	mocks.startThread.mockResolvedValue(handoff);

	await expect(createHandoff().start('personal-project', result)).resolves.toBe(outcome);
});

it('requires the Assistant to be ready before starting a conversation', async () => {
	const handoff = createHandoff();
	expect(handoff.available.value).toBe(true);
	ready.value = false;
	await expect(handoff.start('personal-project', result)).resolves.toBe('unavailable');

	expect(handoff.available.value).toBe(false);
	expect(mocks.startThread).not.toHaveBeenCalled();
});
