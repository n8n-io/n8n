import type { InstanceAiThreadSubject } from '@n8n/api-types';

import { withAppSubject } from './apps/app-target-binding';
import { withMcpServerSubject } from './custom-mcp-server-target-binding';
import { withAgentSubject } from './orchestration/agent-target-binding';

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
			return withAgentSubject(metadata, subject);
		case 'app':
			return withAppSubject(metadata, subject);
		case 'mcpServer':
			return withMcpServerSubject(metadata, subject);
	}
}
