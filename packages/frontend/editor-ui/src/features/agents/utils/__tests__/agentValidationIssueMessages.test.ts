import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { resolveAgentValidationIssueMessageKey } from '../agentValidationIssueMessages';

describe('resolveAgentValidationIssueMessageKey', () => {
	it.each([
		['missing_required', 'missingRequired'],
		['invalid_value', 'invalidValue'],
		['missing_credential', 'missingCredential'],
		['invalid_credential', 'invalidCredential'],
		['incompatible_credential', 'incompatibleCredential'],
		['missing_reference', 'missingReference'],
		['incompatible_reference', 'incompatibleReference'],
		['restricted_node_type', 'restrictedNodeType'],
	] satisfies Array<[AgentConfigValidationIssue['code'], string]>)(
		'uses the generic message for %s',
		(code, key) => {
			expect(
				resolveAgentValidationIssueMessageKey({
					code,
					path: 'futureField',
					capability: { kind: 'agent' },
				}),
			).toBe(`agents.builder.validation.issue.${key}`);
		},
	);

	it.each([
		[{ kind: 'subAgent' }, 'missing_reference', 'subAgent.missingReference'],
		[{ kind: 'subAgent' }, 'incompatible_reference', 'subAgent.incompatibleReference'],
		[{ kind: 'skill' }, 'missing_reference', 'skill.missingReference'],
		[{ kind: 'task' }, 'invalid_value', 'task.invalidValue'],
		[{ kind: 'tool', toolType: 'workflow' }, 'missing_reference', 'tool.workflow.missingReference'],
		[
			{ kind: 'tool', toolType: 'workflow' },
			'incompatible_reference',
			'tool.workflow.incompatibleReference',
		],
		[{ kind: 'tool', toolType: 'custom' }, 'missing_reference', 'tool.custom.missingReference'],
		[{ kind: 'tool', toolType: 'node' }, 'missing_reference', 'tool.node.missingReference'],
		[{ kind: 'mcpServer' }, 'incompatible_credential', 'mcpServer.incompatibleCredential'],
	] satisfies Array<
		[AgentConfigValidationIssue['capability'], AgentConfigValidationIssue['code'], string]
	>)('uses the capability-specific message for %j with %s', (capability, code, key) => {
		expect(resolveAgentValidationIssueMessageKey({ capability, code, path: 'config' })).toBe(
			`agents.builder.validation.issue.${key}`,
		);
	});
});
