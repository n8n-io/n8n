import type { INode, WorkflowExecuteMode } from 'n8n-workflow';

import {
	type ErrorWorkflowOwner,
	resolvesErrorWorkflowOnFailure,
	findErrorTrigger,
	findErrorWorkflowTarget,
	staticErrorWorkflowId,
} from '@/workflows/error-workflow-id';

describe('staticErrorWorkflowId', () => {
	it('returns the id for a concrete reference', () => {
		expect(staticErrorWorkflowId('wf-1')).toBe('wf-1');
	});

	it.each([undefined, '', 'DEFAULT', '={{ $json.handler }}'])(
		'returns undefined for %s, which names no concrete workflow',
		(value) => {
			expect(staticErrorWorkflowId(value)).toBeUndefined();
		},
	);
});

const ERROR_TRIGGER_TYPE = 'n8n-nodes-base.errorTrigger';

const node = (name: string, type: string, disabled = false): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	disabled,
});

const workflow = (
	settings: ErrorWorkflowOwner['settings'] = {},
	nodes: INode[] = [node('Schedule', 'n8n-nodes-base.scheduleTrigger')],
): ErrorWorkflowOwner => ({ id: 'wf-1', nodes, settings });

const withErrorTrigger = (settings: ErrorWorkflowOwner['settings'] = {}) =>
	workflow(settings, [
		node('Schedule', 'n8n-nodes-base.scheduleTrigger'),
		node('Error Trigger', ERROR_TRIGGER_TYPE),
	]);

describe('findErrorTrigger', () => {
	it('takes the last Error Trigger, as v1 does', () => {
		const nodes = [node('First', ERROR_TRIGGER_TYPE), node('Second', ERROR_TRIGGER_TYPE)];

		expect(findErrorTrigger(nodes, ERROR_TRIGGER_TYPE)?.name).toBe('Second');
	});

	it('leaves out a disabled Error Trigger', () => {
		const nodes = [node('Live', ERROR_TRIGGER_TYPE), node('Off', ERROR_TRIGGER_TYPE, true)];

		expect(findErrorTrigger(nodes, ERROR_TRIGGER_TYPE)?.name).toBe('Live');
	});

	it('finds nothing in a workflow without one', () => {
		expect(findErrorTrigger(workflow().nodes, ERROR_TRIGGER_TYPE)).toBeUndefined();
	});
});

describe('findErrorWorkflowTarget', () => {
	it('picks the workflow the settings name, before the own Error Trigger', () => {
		expect(
			findErrorWorkflowTarget(
				withErrorTrigger({ errorWorkflow: 'err-wf' }),
				false,
				ERROR_TRIGGER_TYPE,
			),
		).toEqual({ kind: 'target', workflowId: 'err-wf' });
	});

	it('picks a workflow that names itself when the run is no error run', () => {
		expect(
			findErrorWorkflowTarget(workflow({ errorWorkflow: 'wf-1' }), false, ERROR_TRIGGER_TYPE),
		).toEqual({ kind: 'target', workflowId: 'wf-1' });
	});

	it('reports a loop for an error run of a workflow that names itself', () => {
		expect(
			findErrorWorkflowTarget(workflow({ errorWorkflow: 'wf-1' }), true, ERROR_TRIGGER_TYPE),
		).toEqual({ kind: 'loop' });
	});

	it('picks another named workflow for an error run', () => {
		expect(
			findErrorWorkflowTarget(workflow({ errorWorkflow: 'err-wf' }), true, ERROR_TRIGGER_TYPE),
		).toEqual({ kind: 'target', workflowId: 'err-wf' });
	});

	it('picks the failed workflow when it has its own Error Trigger and the settings name none', () => {
		expect(findErrorWorkflowTarget(withErrorTrigger(), false, ERROR_TRIGGER_TYPE)).toEqual({
			kind: 'target',
			workflowId: 'wf-1',
		});
	});

	it('ignores the own Error Trigger for an error run', () => {
		expect(findErrorWorkflowTarget(withErrorTrigger(), true, ERROR_TRIGGER_TYPE)).toEqual({
			kind: 'none',
		});
	});

	it.each(['DEFAULT', '', '={{ $json.id }}'])(
		'falls back to the own Error Trigger for a setting that names no workflow (%j)',
		(errorWorkflow) => {
			expect(
				findErrorWorkflowTarget(withErrorTrigger({ errorWorkflow }), false, ERROR_TRIGGER_TYPE),
			).toEqual({ kind: 'target', workflowId: 'wf-1' });
		},
	);

	it('finds no target without a setting and without an Error Trigger', () => {
		expect(findErrorWorkflowTarget(workflow(), false, ERROR_TRIGGER_TYPE)).toEqual({
			kind: 'none',
		});
	});
});

describe('resolvesErrorWorkflowOnFailure', () => {
	it.each<[string, ErrorWorkflowOwner, WorkflowExecuteMode, boolean]>([
		['a named workflow in a trigger run', workflow({ errorWorkflow: 'err-wf' }), 'trigger', true],
		['the own Error Trigger in a webhook run', withErrorTrigger(), 'webhook', true],
		['the own Error Trigger in an integrated run', withErrorTrigger(), 'integrated', true],
		['nothing in a trigger run', workflow(), 'trigger', false],
		[
			'another named workflow in an error run',
			workflow({ errorWorkflow: 'err-wf' }),
			'error',
			true,
		],
		['the workflow itself in an error run', workflow({ errorWorkflow: 'wf-1' }), 'error', false],
		['the own Error Trigger in an error run', withErrorTrigger(), 'error', false],
	])('decides for %s', (_label, owner, mode, expected) => {
		expect(resolvesErrorWorkflowOnFailure(owner, mode, ERROR_TRIGGER_TYPE)).toBe(expected);
	});
});
