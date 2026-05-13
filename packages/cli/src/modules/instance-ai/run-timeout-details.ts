import type { InstanceAiLivenessSurface, InstanceAiLivenessTimeoutReason } from '@n8n/instance-ai';

export type InstanceAiRunTimeoutDetails = {
	reason: InstanceAiLivenessTimeoutReason;
	surface: InstanceAiLivenessSurface;
	timeoutMs: number;
	elapsedMs: number;
	idleMs: number;
};
