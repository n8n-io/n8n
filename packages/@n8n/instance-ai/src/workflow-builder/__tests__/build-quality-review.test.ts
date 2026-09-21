import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'vitest-mock-extended';

import type { DecisionService } from '../../workflow-compiler/decision/decision-service';
import { reviewBuiltWorkflow } from '../build-quality-review';

const workflow: WorkflowJSON = {
	name: 'Interview booking',
	nodes: [
		{
			id: 'calendar',
			name: 'Book interview',
			type: 'n8n-nodes-base.googleCalendar',
			typeVersion: 1.3,
			position: [0, 0],
			parameters: { resource: 'event', operation: 'create' },
			credentials: {
				googleCalendarOAuth2Api: { id: 'private-credential', name: 'Private calendar' },
			},
			onError: 'continueErrorOutput',
			alwaysOutputData: true,
		},
	],
	connections: {},
};

describe('built workflow review', () => {
	it('reviews executable parameters and error settings without credential records', async () => {
		const decisions = mock<DecisionService>({ kind: 'systemone' });
		decisions.decide.mockResolvedValue({
			ok: true,
			model: 'fixture',
			latencyMs: 42,
			problems: [],
			answers: {
				identity: { type: 'noul', noul: 0.99 },
				recovery: { type: 'noul', noul: 0.01 },
				availability: { type: 'noul', noul: 0.4 },
				duplicates: { type: 'noul', noul: 0.01 },
				parameters: { type: 'noul', noul: 0.99 },
				emptyResults: { type: 'noul', noul: 0.99 },
			},
		});
		const result = await reviewBuiltWorkflow(workflow, decisions);
		expect(result).toMatchObject({ status: 'needs_reasoning', latencyMs: 42 });
		expect(result.checks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ check: 'recovery', outcome: 'no', probabilityOfYes: 0.01 }),
				expect.objectContaining({ check: 'availability', outcome: 'uncertain' }),
			]),
		);
		const request = decisions.decide.mock.calls[0][0];
		expect(request.schemaVersion).toBe('build-quality-v2');
		expect(request.questions.recovery).toMatchObject({
			type: 'noul',
			criteria: {
				true: expect.stringContaining('no external effect followed by a separate database update'),
				false: expect.stringContaining('no recovery path'),
			},
		});
		expect(JSON.stringify(request.state)).toContain('continueErrorOutput');
		expect(JSON.stringify(request.state)).toContain('alwaysOutputData');
		expect(JSON.stringify(request.state)).not.toContain('private-credential');
		expect(result.guidance).toContain('existing setup and approval flow');
		expect(workflow.nodes[0].credentials).toBeDefined();
	});

	it('keeps uncertain and missing answers for LLM review', async () => {
		const decisions = mock<DecisionService>({ kind: 'systemone' });
		decisions.decide.mockResolvedValue({
			ok: true,
			model: 'fixture',
			latencyMs: 12,
			problems: [],
			answers: { recovery: { type: 'noul', noul: 0.5 } },
		});
		const result = await reviewBuiltWorkflow(workflow, decisions);
		expect(result.status).toBe('needs_reasoning');
		expect(result.checks.every((check) => check.outcome === 'uncertain')).toBe(true);
	});

	it('returns unavailable JEV evidence to outer LLM reasoning', async () => {
		const decisions = mock<DecisionService>({ kind: 'systemone' });
		decisions.decide.mockResolvedValue({
			ok: false,
			reason: 'unavailable',
			message: 'Offline',
			latencyMs: 8,
		});
		const result = await reviewBuiltWorkflow(workflow, decisions);
		expect(result).toMatchObject({ status: 'unavailable', latencyMs: 8, checks: [] });
		expect(result.guidance).toContain('Use LLM reasoning');
		expect(decisions.decide).toHaveBeenCalledOnce();
	});

	it('uses outer reasoning without a nested generative review', async () => {
		const decisions = mock<DecisionService>({ kind: 'model' });
		expect(await reviewBuiltWorkflow(workflow, decisions)).toMatchObject({ status: 'unavailable' });
		expect(decisions.decide).not.toHaveBeenCalled();
	});

	it('keeps parameters local when sharing is disabled', async () => {
		const decisions = mock<DecisionService>({ kind: 'systemone' });
		expect(await reviewBuiltWorkflow(workflow, decisions, undefined, false)).toMatchObject({
			status: 'unavailable',
		});
		expect(decisions.decide).not.toHaveBeenCalled();
	});
});
