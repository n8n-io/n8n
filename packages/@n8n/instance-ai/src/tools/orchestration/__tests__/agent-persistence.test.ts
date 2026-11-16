import { createSubAgentResourceIdPrefix } from '../agent-persistence';

const PARENT_THREAD_ID = '00000000-0000-4000-8000-000000000001';

describe('sub-agent persistence', () => {
	it('builds the cleanup prefix for all sub-agent threads under one parent', () => {
		expect(createSubAgentResourceIdPrefix(PARENT_THREAD_ID)).toBe(
			`instance-ai-subagent:${PARENT_THREAD_ID}:`,
		);
	});
});
