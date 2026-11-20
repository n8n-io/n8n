import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { WorkflowEngineType } from 'n8n-workflow';

import type { InstanceAiEngineSetup } from '../../types';

/**
 * Where the target engine of a build comes from.
 * - `workflow-settings`: the code sets `settings.engineType`.
 * - `saved-workflow`: an edit without `engineType` keeps the engine of the saved workflow.
 * - `instance-default`: a new workflow without `engineType` gets the instance default.
 * - `no-engine`: the engine is not known. A workflow without an engine runs on v1.
 */
export type TargetEngineSource =
	| 'workflow-settings'
	| 'saved-workflow'
	| 'instance-default'
	| 'no-engine';

export interface TargetEngine {
	engine: WorkflowEngineType;
	source: TargetEngineSource;
}

const SOURCE_LABELS: Record<TargetEngineSource, string> = {
	'workflow-settings': 'set in the workflow settings',
	'saved-workflow': 'engine of the saved workflow',
	'instance-default': 'instance default',
	'no-engine': 'no engine set',
};

function toEngineType(value: unknown): WorkflowEngineType | undefined {
	return value === 'v1' || value === 'v2' ? value : undefined;
}

/** The engine that a new workflow without `settings.engineType` gets when it is saved. */
export function newWorkflowEngine(
	engineSetup: InstanceAiEngineSetup | undefined,
): WorkflowEngineType {
	return engineSetup?.engineV2Available === true && engineSetup.newWorkflowEngine === 'v2'
		? 'v2'
		: 'v1';
}

/**
 * Finds the engine for code that does not set `settings.engineType`. An update merges
 * the settings over the stored settings, so an edit keeps the engine of the saved
 * workflow. A new workflow gets the instance default.
 */
export function resolveFallbackEngine(input: {
	engineSetup: InstanceAiEngineSetup | undefined;
	isEdit: boolean;
	/** The saved workflow of an edit. Absent when it cannot be read. */
	savedWorkflow?: Pick<WorkflowJSON, 'settings'>;
}): TargetEngine {
	if (!input.isEdit) {
		return { engine: newWorkflowEngine(input.engineSetup), source: 'instance-default' };
	}
	if (!input.savedWorkflow) return { engine: 'v1', source: 'no-engine' };
	return {
		engine: toEngineType(input.savedWorkflow.settings?.engineType) ?? 'v1',
		source: 'saved-workflow',
	};
}

/**
 * Finds the engine that runs the built workflow. The `engineType` in the code wins.
 * This is the same order that `validateWorkflow()` uses.
 */
export function resolveTargetEngine(workflow: WorkflowJSON, fallback: TargetEngine): TargetEngine {
	const engine = toEngineType(workflow.settings?.engineType);
	return engine ? { engine, source: 'workflow-settings' } : fallback;
}

/** Text for the build result, for example "target engine: v2 (instance default)". */
export function formatTargetEngine(target: TargetEngine): string {
	return `target engine: ${target.engine} (${SOURCE_LABELS[target.source]})`;
}

/**
 * Tells if the build result names the engine. Without the `engine-v2` module, every
 * workflow runs on v1, so the result stays the same as before unless the code asks for v2.
 */
export function shouldReportTargetEngine(
	engineSetup: InstanceAiEngineSetup | undefined,
	target: TargetEngine,
): boolean {
	return engineSetup?.engineV2Available === true || target.engine === 'v2';
}
