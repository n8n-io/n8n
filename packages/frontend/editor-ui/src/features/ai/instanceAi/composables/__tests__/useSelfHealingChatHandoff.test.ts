import type { SelfHealingChatHandoff, SelfHealingChatInput } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { computed, defineComponent, getCurrentInstance, ref } from 'vue';

import { useSelfHealingChatHandoff } from '../useSelfHealingChatHandoff';

const mocks = vi.hoisted(() => ({
	createHandoff: vi.fn(),
	ensurePersonalProjectId: vi.fn(),
	startThread: vi.fn(),
	showError: vi.fn(),
}));
const ready = ref(true);

vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => computed(() => ready.value),
}));
vi.mock('../useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: mocks.createHandoff,
	ensurePersonalProjectId: mocks.ensurePersonalProjectId,
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));

const input: SelfHealingChatInput = {
	resultId: 'result-1',
	outcome: 'needs_you',
	report: 'Update the account settings, then test the workflow.',
	workflowId: 'workflow-1',
	workflowName: 'Daily report',
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
	vi.clearAllMocks();
	ready.value = true;
	mocks.createHandoff.mockImplementation(() => {
		expect(getCurrentInstance()).not.toBeNull();
		return { startThread: mocks.startThread };
	});
	mocks.ensurePersonalProjectId.mockResolvedValue('personal-project');
	mocks.startThread.mockResolvedValue(undefined);
});

it.each(['needs_you', 'could_not_fix'] as const)(
	'opens a private chat for %s with the saved report and workflow',
	async (outcome) => {
		const handoff = createHandoff();
		expect(mocks.startThread).not.toHaveBeenCalled();

		await handoff.start({ ...input, outcome });

		expect(mocks.createHandoff).toHaveBeenCalledOnce();
		expect(mocks.startThread).toHaveBeenCalledWith(
			'personal-project',
			expect.stringContaining(input.report),
			{ kind: 'prefill', prefillType: 'handoff_self_healing_result' },
			{
				source: 'self_healing_result',
				origin: 'internal',
				sourceContext: { resultId: 'result-1', outcome },
			},
			[{ type: 'workflow', id: 'workflow-1', name: 'Daily report' }],
		);
		expect(mocks.startThread.mock.calls[0][1]).toContain(input.workflowName);
		expect(mocks.startThread.mock.calls[0][1]).not.toContain('Execution ID:');
	},
);

it('includes an authorized execution reference in the opening message', async () => {
	await createHandoff().start({ ...input, executionId: 'execution-1' });

	expect(mocks.startThread.mock.calls[0][1]).toContain('Execution ID: execution-1');
	expect(mocks.startThread.mock.calls[0][4]).toEqual([
		{
			type: 'workflow',
			id: 'workflow-1',
			name: 'Daily report',
			executionId: 'execution-1',
		},
	]);
});

it('starts a new handoff on each click', async () => {
	const handoff = createHandoff();
	await handoff.start(input);
	await handoff.start(input);

	expect(mocks.startThread).toHaveBeenCalledTimes(2);
	expect(mocks.ensurePersonalProjectId).toHaveBeenCalledTimes(2);
});

it('tracks Assistant readiness and does not start when it becomes unavailable', async () => {
	const handoff = createHandoff();
	expect(handoff.available.value).toBe(true);
	ready.value = false;

	await handoff.start(input);

	expect(handoff.available.value).toBe(false);
	expect(mocks.ensurePersonalProjectId).not.toHaveBeenCalled();
	expect(mocks.startThread).not.toHaveBeenCalled();
});

it('shows an error when the personal project is unavailable', async () => {
	mocks.ensurePersonalProjectId.mockResolvedValue(null);

	await createHandoff().start(input);

	expect(mocks.showError).toHaveBeenCalledOnce();
	expect(mocks.startThread).not.toHaveBeenCalled();
});

it('waits for the personal project before starting the handoff', async () => {
	const project = createDeferredPromise<string | null>();
	mocks.ensurePersonalProjectId.mockReturnValue(project.promise);
	const pending = createHandoff().start(input);
	expect(mocks.startThread).not.toHaveBeenCalled();

	project.resolve('personal-project');
	await pending;

	expect(mocks.startThread).toHaveBeenCalledOnce();
});

it('passes navigation errors to the detail view', async () => {
	const error = new Error('Navigation failed.');
	mocks.startThread.mockRejectedValue(error);

	await expect(createHandoff().start(input)).rejects.toBe(error);
});
