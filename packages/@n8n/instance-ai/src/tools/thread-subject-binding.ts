import type { InstanceAiThreadSubject } from '@n8n/api-types';

import { withAttachedAppTarget } from './apps/app-target-binding';
import { withAttachedAgentTarget } from './orchestration/agent-target-binding';

/**
 * The thread metadata that binds the resource that a thread starts on. Each kind
 * of resource keeps its own metadata keys, so one thread can work on an agent
 * and apps. Returns `undefined` when the binding changes nothing.
 */
export function withThreadSubject(
	metadata: Record<string, unknown>,
	subject: InstanceAiThreadSubject,
): Record<string, unknown> | undefined {
	switch (subject.type) {
		case 'agent':
			return withAttachedAgentTarget(metadata, subject);
		case 'app':
			return withAttachedAppTarget(metadata, subject);
	}
}
