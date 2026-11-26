import type { InstanceAiAgentPreviewHandoffContext } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { handoffContextKey } from '@/features/ai/instanceAi/instanceAi.handoffContext';

describe('handoffContextKey', () => {
	const context: InstanceAiAgentPreviewHandoffContext = {
		source: 'agent-preview',
		agentId: 'agent-1',
		threadId: 'thread-1',
	};

	it.each([
		{ executionId: undefined, expected: 'agent-preview:agent-1:thread-1:' },
		{ executionId: 'exec-1', expected: 'agent-preview:agent-1:thread-1:exec-1' },
	])(
		'preserves saved dismissal keys with executionId=$executionId',
		({ executionId, expected }) => {
			expect(handoffContextKey({ ...context, executionId })).toBe(expected);
		},
	);

	it('distinguishes session lists that share the primary session', () => {
		const firstKey = handoffContextKey({ ...context, threadIds: ['thread-1', 'thread-2'] });
		const secondKey = handoffContextKey({ ...context, threadIds: ['thread-1', 'thread-3'] });

		expect(firstKey).not.toBe(handoffContextKey(context));
		expect(firstKey).not.toBe(secondKey);
	});
});
