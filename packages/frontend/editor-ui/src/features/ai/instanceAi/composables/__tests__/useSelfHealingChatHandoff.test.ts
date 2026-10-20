import type { SelfHealingChatHandoff, SelfHealingChatInput } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { computed, defineComponent, getCurrentInstance, ref } from 'vue';

import { useSelfHealingChatHandoff } from '../useSelfHealingChatHandoff';

const mocks = vi.hoisted(() => ({ startThread: vi.fn(), useHandoff: vi.fn() }));
const ready = ref(true);

vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => computed(() => ready.value),
}));
vi.mock('../useInstanceAiHandoff', () => ({ useInstanceAiHandoff: mocks.useHandoff }));

const result: SelfHealingChatInput = {
	resultId: 'result-1',
	projectId: 'team-project',
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
	mocks.useHandoff.mockImplementation(() => {
		expect(getCurrentInstance()).not.toBeNull();
		return { startThread: mocks.startThread };
	});
});

it('starts the normal chat handoff with the full report and execution attachment', async () => {
	const handoff = createHandoff();
	await handoff.start(result);

	expect(mocks.startThread).toHaveBeenCalledExactlyOnceWith(
		'team-project',
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

it('tells the Assistant when the suggested changes are already in the draft', async () => {
	await createHandoff().start({ ...result, reviewState: 'applied' });

	expect(mocks.startThread.mock.calls[0]?.[1]).toBe(
		`Continue from this investigation report. Help me resolve the remaining issues.\n\nThe suggested changes have already been applied to the workflow draft. They have not been published.\n\n${result.report}`,
	);
});

it('omits an unavailable execution from the workflow attachment', async () => {
	await createHandoff().start({ ...result, execution: { status: 'unavailable' } });

	expect(mocks.startThread.mock.calls[0]?.[4]).toEqual([{ type: 'workflow', id: 'workflow-1' }]);
});

it('requires the Assistant to be ready before starting a conversation', async () => {
	const handoff = createHandoff();
	expect(handoff.available.value).toBe(true);
	ready.value = false;
	await handoff.start(result);

	expect(handoff.available.value).toBe(false);
	expect(mocks.startThread).not.toHaveBeenCalled();
});
