import type { InstanceAiTaskKind } from '@n8n/api-types';
import { createHash } from 'node:crypto';

interface BackgroundTaskExecutionKeyInput {
	kind: InstanceAiTaskKind;
	planId?: string;
	phaseId?: string;
	targetId?: string;
	goal?: string;
	constraints?: string;
}

function normalizeExecutionText(value: string | undefined): string {
	return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

function hashExecutionText(parts: string[]): string {
	return createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex').slice(0, 16);
}

export function createBackgroundTaskExecutionKey(input: BackgroundTaskExecutionKeyInput): string {
	if (input.planId && input.phaseId) {
		return `plan:${input.planId}:${input.phaseId}:${input.kind}`;
	}

	const targetId = normalizeExecutionText(input.targetId) || 'new';
	const goalHash = hashExecutionText([
		input.kind,
		targetId,
		normalizeExecutionText(input.goal),
		normalizeExecutionText(input.constraints),
	]);

	return `${input.kind}:${targetId}:${goalHash}`;
}
