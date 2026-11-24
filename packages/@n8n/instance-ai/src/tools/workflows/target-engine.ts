import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { WORKFLOW_ENGINE_TYPES, type WorkflowEngineType } from 'n8n-workflow';
import { z } from 'zod';

import type { InstanceAiEngineSetup } from '../../types';

/**
 * Where the target engine of a build comes from.
 * - `workflow-settings`: the code sets `settings.engineType`.
 * - `saved-workflow`: an edit without `engineType` keeps the engine of the saved workflow.
 * - `instance-default`: a new workflow without `engineType` gets the instance default.
 * - `saved-workflow-unreadable`: an edit whose saved workflow cannot be read, so its
 *   engine is not known.
 */
export const targetEngineSourceSchema = z.enum([
	'workflow-settings',
	'saved-workflow',
	'instance-default',
	'saved-workflow-unreadable',
]);

export type TargetEngineSource = z.infer<typeof targetEngineSourceSchema>;

/** The engine that a build was validated for, and where that engine comes from. */
export const targetEngineSchema = z.object({
	engine: z.enum(WORKFLOW_ENGINE_TYPES),
	source: targetEngineSourceSchema,
});

export interface TargetEngine {
	engine: WorkflowEngineType;
	source: TargetEngineSource;
}

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
	if (!input.savedWorkflow) {
		// The update can still run on v2. Engine v2 checks add errors to the v1 checks, so
		// a v2 check cannot pass a workflow that v2 cannot run.
		return {
			engine: input.engineSetup?.engineV2Available === true ? 'v2' : 'v1',
			source: 'saved-workflow-unreadable',
		};
	}
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

/** Tells if the `targetEngine` field of a build result names engine v2. */
export function namesEngineV2(targetEngine: unknown): boolean {
	const parsed = targetEngineSchema.safeParse(targetEngine);
	return parsed.success && parsed.data.engine === 'v2';
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
