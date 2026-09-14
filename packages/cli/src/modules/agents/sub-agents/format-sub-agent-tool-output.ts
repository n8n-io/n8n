import {
	generateResultToDelegateSubAgentOutput,
	type DelegateSubAgentToolOutput,
} from '@n8n/agents';

import type { SubAgentRunResult } from './sub-agent-runner';

/**
 * Map a run result to the delegate tool's output shape shared by all
 * dispatchers. Lives in its own module: both the delegate tool and the
 * background runner need it, and either of those hosting it would close an
 * import cycle through the runtime reconstruction service.
 */
export function formatSubAgentToolOutput(result: SubAgentRunResult): DelegateSubAgentToolOutput {
	const output = generateResultToDelegateSubAgentOutput(
		result.taskPath,
		result.result,
		result.threadId,
	);
	return {
		...output,
		...(output.status === 'suspended' && result.resumeContext !== undefined
			? { resumeContext: result.resumeContext }
			: {}),
	};
}
