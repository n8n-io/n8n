import type { InstanceAiEvent } from '@n8n/api-types';

import { buildVerdictDisclosureEvent, type VerdictDisclosureRecord } from '../verdict-disclosure';
import type { VerificationClaim, WorkflowBuildOutcome } from '../workflow-loop-state';

function makeClaim(overrides: Partial<VerificationClaim> = {}): VerificationClaim {
	return {
		level: 'partial',
		plannedNodeCount: 12,
		reachedNodeCount: 5,
		nodesNotReached: ['Send Email', 'Log Row'],
		simulatedNodes: [{ nodeName: 'Create Event', reason: 'Creates a record' }],
		pinnedNodes: [],
		unprovenTargets: [],
		publishReady: false,
		liveTestRecommended: true,
		...overrides,
	};
}

function makeRecord(
	workItemId: string,
	verifiedAt: string | undefined,
	claim: VerificationClaim | undefined,
): VerdictDisclosureRecord {
	const outcome = {
		workItemId,
		taskId: 'task_1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Built',
		verification: { attempted: true, success: true, verifiedAt, claim },
	} as unknown as WorkflowBuildOutcome;
	return { state: { workItemId }, lastBuildOutcome: outcome };
}

const args = {
	runId: 'run-1',
	agentId: 'orchestrator:run-1',
};

describe('buildVerdictDisclosureEvent', () => {
	it('discloses a partial claim as a text event on the root agent', () => {
		const event = buildVerdictDisclosureEvent({
			...args,
			records: [makeRecord('wi_1', '2026-09-03T10:00:00.000Z', makeClaim())],
			events: [],
		});

		expect(event).toBeDefined();
		expect(event?.type).toBe('text-delta');
		expect(event?.agentId).toBe('orchestrator:run-1');
		expect(event?.responseId).toBe('verdict-disclosure:wi_1:2026-09-03T10:00:00.000Z');
		const text = (event as { payload: { text: string } }).payload.text;
		expect(text).toContain('Not fully verified');
		expect(text).toContain('Send Email, Log Row');
		expect(text).toContain('Create Event');
		expect(text).toContain('live end-to-end test');
	});

	it('stays silent for a fully verified claim', () => {
		const event = buildVerdictDisclosureEvent({
			...args,
			records: [
				makeRecord(
					'wi_1',
					'2026-09-03T10:00:00.000Z',
					makeClaim({
						level: 'verified',
						nodesNotReached: [],
						simulatedNodes: [],
						reachedNodeCount: 12,
						publishReady: true,
						liveTestRecommended: false,
					}),
				),
			],
			events: [],
		});

		expect(event).toBeUndefined();
	});

	it('names the unproven target for an unproven claim', () => {
		const event = buildVerdictDisclosureEvent({
			...args,
			records: [
				makeRecord(
					'wi_1',
					'2026-09-03T10:00:00.000Z',
					makeClaim({ level: 'unproven', unprovenTargets: ['Send Email'] }),
				),
			],
			events: [],
		});

		const text = (event as { payload: { text: string } }).payload.text;
		expect(text).toContain('Changed, but not verified');
		expect(text).toContain('This change was about Send Email');
	});

	it('discloses once per verification however often the run hands back', () => {
		const records = [makeRecord('wi_1', '2026-09-03T10:00:00.000Z', makeClaim())];
		const first = buildVerdictDisclosureEvent({ ...args, records, events: [] });
		const second = buildVerdictDisclosureEvent({
			...args,
			records,
			events: [first as InstanceAiEvent],
		});

		expect(first).toBeDefined();
		expect(second).toBeUndefined();
	});

	it('discloses again after a later re-verification', () => {
		const first = buildVerdictDisclosureEvent({
			...args,
			records: [makeRecord('wi_1', '2026-09-03T10:00:00.000Z', makeClaim())],
			events: [],
		});
		const afterReverify = buildVerdictDisclosureEvent({
			...args,
			records: [makeRecord('wi_1', '2026-09-03T11:00:00.000Z', makeClaim())],
			events: [first as InstanceAiEvent],
		});

		expect(afterReverify).toBeDefined();
		expect(afterReverify?.responseId).toBe('verdict-disclosure:wi_1:2026-09-03T11:00:00.000Z');
	});

	it('discloses the most recent verification when several work items exist', () => {
		const event = buildVerdictDisclosureEvent({
			...args,
			records: [
				makeRecord('wi_old', '2026-09-03T09:00:00.000Z', makeClaim()),
				makeRecord('wi_new', '2026-09-03T12:00:00.000Z', makeClaim({ level: 'unproven' })),
			],
			events: [],
		});

		expect(event?.responseId).toBe('verdict-disclosure:wi_new:2026-09-03T12:00:00.000Z');
	});

	it('stays silent when no verification carries a claim', () => {
		expect(
			buildVerdictDisclosureEvent({
				...args,
				records: [makeRecord('wi_1', '2026-09-03T10:00:00.000Z', undefined)],
				events: [],
			}),
		).toBeUndefined();
	});

	it('stays silent when the verification has no timestamp to key on', () => {
		expect(
			buildVerdictDisclosureEvent({
				...args,
				records: [makeRecord('wi_1', undefined, makeClaim())],
				events: [],
			}),
		).toBeUndefined();
	});

	it('stays silent when the thread has no work items', () => {
		expect(buildVerdictDisclosureEvent({ ...args, records: [], events: [] })).toBeUndefined();
	});
});
