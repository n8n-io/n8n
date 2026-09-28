import { describe, expect, it } from 'vitest';
import type { AgentConfigValidationIssue } from '@n8n/api-types';

import { resolveAgentValidationIssueMessageKey } from '../agentValidationIssueMessages';

describe('resolveAgentValidationIssueMessageKey', () => {
	it('names a policy block on a node tool instead of the generic reference message', () => {
		const issue: AgentConfigValidationIssue = {
			code: 'incompatible_reference',
			path: 'tools.0.node.nodeType',
			capability: { kind: 'tool', id: 'post_message', index: 0, toolType: 'node' },
			reason: 'blocked_by_policy',
		};

		expect(resolveAgentValidationIssueMessageKey(issue)).toBe(
			'agents.builder.validation.issue.tool.node.blockedByPolicy',
		);
	});
});
