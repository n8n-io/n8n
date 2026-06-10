import type { DesktopAssistantTaskOutcome } from '@n8n/api-types';

// `readDesktopTaskOutcome` is provided by @n8n/instance-ai; mocked here so the
// pure finished-computation can be exercised in isolation.
jest.mock('@n8n/instance-ai', () => ({
	readDesktopTaskOutcome: jest.fn(),
}));

// eslint-disable-next-line import-x/order
import { readDesktopTaskOutcome } from '@n8n/instance-ai';

import {
	computeTaskRunFinishedEvent,
	mapRunFinishStatus,
} from '../desktop-assistant-task-run.service';

const readDesktopTaskOutcomeMock = readDesktopTaskOutcome as jest.MockedFunction<
	(metadata: unknown, runId: string) => DesktopAssistantTaskOutcome | undefined
>;

beforeEach(() => {
	jest.clearAllMocks();
});

describe('mapRunFinishStatus', () => {
	test.each([
		['completed', 'success'],
		['cancelled', 'canceled'],
		['error', 'error'],
	] as const)('maps run-finish %s to %s', (finishStatus, expected) => {
		expect(mapRunFinishStatus(finishStatus)).toBe(expected);
	});
});

describe('computeTaskRunFinishedEvent', () => {
	const runId = 'run-1';

	test('reports the run status and whether any tool call was seen', () => {
		const event = computeTaskRunFinishedEvent({
			finishStatus: 'completed',
			tookAction: true,
			threadMetadata: {},
			runId,
		});

		expect(event).toMatchObject({ type: 'finished', status: 'success', tookAction: true });
	});

	test('includes the agent-reported outcome from thread metadata when present', () => {
		const outcome: DesktopAssistantTaskOutcome = {
			success: true,
			title: 'Renamed desktop files',
			summary: 'Renamed 3 files on the desktop.',
		};
		readDesktopTaskOutcomeMock.mockReturnValue(outcome);
		const metadata = { some: 'metadata' };

		const event = computeTaskRunFinishedEvent({
			finishStatus: 'completed',
			tookAction: true,
			threadMetadata: metadata,
			runId,
		});

		expect(readDesktopTaskOutcomeMock).toHaveBeenCalledWith(metadata, runId);
		expect(event).toMatchObject({ outcome });
	});

	test('omits the outcome when the agent skipped its outcome report', () => {
		readDesktopTaskOutcomeMock.mockReturnValue(undefined);

		const event = computeTaskRunFinishedEvent({
			finishStatus: 'error',
			tookAction: false,
			threadMetadata: undefined,
			runId,
		});

		expect(event).toMatchObject({ type: 'finished', status: 'error', tookAction: false });
		if (event.type === 'finished') {
			expect(event.outcome).toBeUndefined();
		}
	});

	test('includes the built workflowId for a promote run with a submitted workflow-loop outcome', () => {
		const threadMetadata = {
			instanceAiWorkflowLoop: {
				wi_1: {
					lastBuildOutcome: { runId, submitted: true, workflowId: 'wf-built' },
				},
			},
		};

		const event = computeTaskRunFinishedEvent({
			finishStatus: 'completed',
			tookAction: true,
			threadMetadata,
			runId,
		});

		expect(event).toMatchObject({ workflowId: 'wf-built' });
	});

	test('omits workflowId for a one-shot run (no workflow-loop outcome for this run)', () => {
		const threadMetadata = {
			instanceAiWorkflowLoop: {
				wi_1: {
					lastBuildOutcome: { runId: 'some-other-run', submitted: true, workflowId: 'wf-other' },
				},
			},
		};

		const event = computeTaskRunFinishedEvent({
			finishStatus: 'cancelled',
			tookAction: true,
			threadMetadata,
			runId,
		});

		expect(event).toMatchObject({ type: 'finished', status: 'canceled' });
		if (event.type === 'finished') {
			expect(event.workflowId).toBeUndefined();
		}
	});
});
