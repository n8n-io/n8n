import type { InstanceAiRunFinishEvent } from './schemas/instance-ai.schema';

export type SelfHealingInvestigationStatus = {
	investigationId: string;
	workflowId: string;
	projectId: string;
	backgroundUserId: string;
	phase: 'investigating' | 'finalizing' | 'completed' | 'stopped';
	/** Technical status comes from the existing Assistant run history. */
	run: Pick<InstanceAiRunFinishEvent['payload'], 'status' | 'reason'> | null;
	resultId: string | null;
	createdAt: string;
	finishedAt: string | null;
};
