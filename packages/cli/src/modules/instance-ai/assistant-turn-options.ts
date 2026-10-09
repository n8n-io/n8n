import type {
	ComputerUseChannel,
	InstanceAiAttachment,
	InstanceAiBuildMode,
	InstanceAiHandoffContext,
	InstanceAiThreadArtifactsContext,
	InstanceAiThreadRunTarget,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { PlannedBuildFollowUp } from './planned-task-action-runner';
import type { OrchestratorResumeReason } from './tracing/instance-ai-tracing.service';

/** Id of the n8n Assistant instance agent in the Agents tables. */
export const ASSISTANT_AGENT_ID = 'n8n-assistant';
export const ASSISTANT_AGENT_NAME = 'n8n Assistant';

/** Checkpoint host metadata key that carries the turn options to a resume. */
export const ASSISTANT_TURN_METADATA_KEY = 'instanceAiTurn';

/**
 * What one Assistant turn needs besides the message. The queue stores these
 * with the message, and the checkpoint stores them for a resume, so any main
 * can run the turn. Nothing may pass through process memory.
 */
export interface AssistantTurnOptions {
	/** Event run id. A resumed segment keeps the run id of its suspended turn. */
	runId: string;
	messageGroupId?: string;
	timeZone?: string;
	pushRef?: string;
	buildMode?: InstanceAiBuildMode;
	promptVersion?: string;
	computerUseChannels?: ComputerUseChannel[];
	observerThresholdTokens?: number;
	/** Where the chat runs. A shared chat runs locally, whatever this says. */
	runTarget?: InstanceAiThreadRunTarget;
	attachments?: InstanceAiAttachment[];
	handoffContext?: InstanceAiHandoffContext;
	threadArtifacts?: InstanceAiThreadArtifactsContext;
	/** Set for a machine follow-up that the backend started. */
	resumeReason?: OrchestratorResumeReason;
	isReplanFollowUp?: boolean;
	checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string };
	plannedBuild?: Omit<PlannedBuildFollowUp, 'savedOutcome'>;
	/** The host sends the files as references; do not inline their bytes in the input. */
	fileRefsHandledByHost?: boolean;
}

/** Thread metadata key for the live run: its run id, message group and the group's run ids. */
export const LIVE_RUN_METADATA_KEY = 'assistantLiveRun';

/** Thread-level defaults that machine follow-ups reuse from the last user turn. */
export const ASSISTANT_TURN_DEFAULTS_KEY = 'assistantTurnDefaults';

/**
 * Thread metadata key for a lost link, at the top level. The turn defaults are replaced on
 * every turn, so the key sits outside them.
 */
export const ASSISTANT_RUN_TARGET_LOST_KEY = 'assistantRunTargetLost';

export type AssistantTurnDefaults = Pick<
	AssistantTurnOptions,
	'timeZone' | 'pushRef' | 'computerUseChannels' | 'buildMode' | 'promptVersion' | 'runTarget'
>;

export function readAssistantTurnOptions(value: unknown): AssistantTurnOptions {
	if (!isRecord(value) || typeof value.runId !== 'string') {
		return { runId: '' };
	}
	// Written only by this module. JSON round trips keep the shape.
	return value as unknown as AssistantTurnOptions;
}

export function toJsonObject(options: AssistantTurnOptions): Record<string, unknown> {
	return JSON.parse(JSON.stringify(options)) as Record<string, unknown>;
}
