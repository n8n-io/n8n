import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiEngineSetup } from '../../../types';
import {
	namesEngineV2,
	newWorkflowEngine,
	resolveFallbackEngine,
	resolveTargetEngine,
	shouldReportTargetEngine,
	targetEngineSchema,
} from '../target-engine';

const v2Default: InstanceAiEngineSetup = { engineV2Available: true, newWorkflowEngine: 'v2' };
const v1Default: InstanceAiEngineSetup = { engineV2Available: true, newWorkflowEngine: 'v1' };
const noModule: InstanceAiEngineSetup = { engineV2Available: false, newWorkflowEngine: 'v1' };

const workflowWith = (settings?: WorkflowJSON['settings']): WorkflowJSON => ({
	name: 'Workflow',
	nodes: [],
	connections: {},
	...(settings ? { settings } : {}),
});

describe('newWorkflowEngine', () => {
	it('returns v2 only when the module is active and v2 is the default', () => {
		expect(newWorkflowEngine(v2Default)).toBe('v2');
		expect(newWorkflowEngine(v1Default)).toBe('v1');
		expect(newWorkflowEngine({ engineV2Available: false, newWorkflowEngine: 'v2' })).toBe('v1');
		expect(newWorkflowEngine(undefined)).toBe('v1');
	});
});

describe('resolveFallbackEngine', () => {
	it('gives a new workflow the v2 instance default', () => {
		expect(resolveFallbackEngine({ engineSetup: v2Default, isEdit: false })).toEqual({
			engine: 'v2',
			source: 'instance-default',
		});
	});

	it('gives a new workflow the v1 instance default', () => {
		expect(resolveFallbackEngine({ engineSetup: v1Default, isEdit: false })).toEqual({
			engine: 'v1',
			source: 'instance-default',
		});
	});

	it('gives a new workflow v1 when the host sends no engine setup', () => {
		expect(resolveFallbackEngine({ engineSetup: undefined, isEdit: false })).toEqual({
			engine: 'v1',
			source: 'instance-default',
		});
	});

	it('keeps the engine of a saved v1 workflow on an instance with v2 as default', () => {
		expect(
			resolveFallbackEngine({
				engineSetup: v2Default,
				isEdit: true,
				savedWorkflow: workflowWith({ engineType: 'v1' }),
			}),
		).toEqual({ engine: 'v1', source: 'saved-workflow' });
	});

	it('keeps the engine of a saved v2 workflow', () => {
		expect(
			resolveFallbackEngine({
				engineSetup: v1Default,
				isEdit: true,
				savedWorkflow: workflowWith({ engineType: 'v2' }),
			}),
		).toEqual({ engine: 'v2', source: 'saved-workflow' });
	});

	it('uses v1 for a saved workflow without an engine', () => {
		expect(
			resolveFallbackEngine({
				engineSetup: v2Default,
				isEdit: true,
				savedWorkflow: workflowWith(),
			}),
		).toEqual({ engine: 'v1', source: 'saved-workflow' });
	});

	it('checks for v2 when the saved workflow cannot be read and the module is active', () => {
		expect(resolveFallbackEngine({ engineSetup: v1Default, isEdit: true })).toEqual({
			engine: 'v2',
			source: 'saved-workflow-unreadable',
		});
	});

	it('uses v1 when the saved workflow cannot be read and the module is not active', () => {
		expect(resolveFallbackEngine({ engineSetup: noModule, isEdit: true })).toEqual({
			engine: 'v1',
			source: 'saved-workflow-unreadable',
		});
	});
});

describe('resolveTargetEngine', () => {
	it('uses the engineType of the code over the fallback', () => {
		expect(
			resolveTargetEngine(workflowWith({ engineType: 'v2' }), {
				engine: 'v1',
				source: 'saved-workflow',
			}),
		).toEqual({ engine: 'v2', source: 'workflow-settings' });
	});

	it('uses the fallback when the code sets no engineType', () => {
		const fallback = { engine: 'v2', source: 'instance-default' } as const;
		expect(resolveTargetEngine(workflowWith(), fallback)).toEqual(fallback);
	});
});

describe('targetEngineSchema', () => {
	it('accepts each resolved target engine', () => {
		const targets = [
			resolveFallbackEngine({ engineSetup: v2Default, isEdit: false }),
			resolveFallbackEngine({ engineSetup: v2Default, isEdit: true }),
			resolveFallbackEngine({
				engineSetup: v2Default,
				isEdit: true,
				savedWorkflow: workflowWith(),
			}),
			resolveTargetEngine(workflowWith({ engineType: 'v2' }), {
				engine: 'v1',
				source: 'saved-workflow',
			}),
		];

		for (const target of targets) {
			expect(targetEngineSchema.parse(target)).toEqual(target);
		}
	});

	it('rejects an unknown engine', () => {
		expect(targetEngineSchema.safeParse({ engine: 'v3', source: 'instance-default' }).success).toBe(
			false,
		);
	});
});

describe('namesEngineV2', () => {
	it('reads the engine from the target engine field', () => {
		expect(namesEngineV2({ engine: 'v2', source: 'instance-default' })).toBe(true);
		expect(namesEngineV2({ engine: 'v1', source: 'saved-workflow' })).toBe(false);
	});

	it.each([
		undefined,
		42,
		'',
		'v2',
		'target engine: v2 (instance default)',
		{ engine: 'v2' },
		{ engine: 'v2', source: 'unknown' },
	])('returns false for %p', (value) => {
		expect(namesEngineV2(value)).toBe(false);
	});
});

describe('shouldReportTargetEngine', () => {
	it('reports the engine when the module is active', () => {
		expect(shouldReportTargetEngine(v1Default, { engine: 'v1', source: 'instance-default' })).toBe(
			true,
		);
	});

	it('reports a v2 engine without the module', () => {
		expect(shouldReportTargetEngine(noModule, { engine: 'v2', source: 'workflow-settings' })).toBe(
			true,
		);
	});

	it('does not report a v1 engine without the module', () => {
		expect(shouldReportTargetEngine(noModule, { engine: 'v1', source: 'instance-default' })).toBe(
			false,
		);
		expect(shouldReportTargetEngine(undefined, { engine: 'v1', source: 'instance-default' })).toBe(
			false,
		);
	});
});
