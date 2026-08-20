import type { AgentConfigValidationIssue } from '@n8n/api-types';
import type { BaseTextKey, I18nClass } from '@n8n/i18n';
import { describe, expect, it } from 'vitest';

import { agentValidationIssueLine, agentValidationIssueMessage } from '../agentValidationIssues';

// Returns the resolved key (plus any interpolated id) so the assertions below
// pin down which copy a given issue maps to, without depending on en.json.
const i18n = {
	baseText: (key: BaseTextKey, options?: { interpolate?: Record<string, string | number> }) => {
		const id = options?.interpolate?.id;
		return id ? `${key}(${id})` : key;
	},
} as Pick<I18nClass, 'baseText'>;

describe('agentValidationIssueMessage', () => {
	it('resolves path-specific copy for the agent’s own fields', () => {
		const issue: AgentConfigValidationIssue = {
			code: 'missing_required',
			path: 'model',
			capability: { kind: 'agent' },
		};

		expect(agentValidationIssueMessage(issue, i18n)).toBe(
			'agents.builder.validation.issue.agent.modelMissing',
		);
	});

	it('resolves tool-type-specific copy before the generic code copy', () => {
		const issue: AgentConfigValidationIssue = {
			code: 'missing_reference',
			path: 'tools.0.workflow',
			capability: { kind: 'tool', id: 'wf-1', index: 0, toolType: 'workflow' },
		};

		expect(agentValidationIssueMessage(issue, i18n)).toBe(
			'agents.builder.validation.issue.tool.workflow.missingReference(wf-1)',
		);
	});

	it('resolves reason-specific copy before the tool-type copy', () => {
		const issue: AgentConfigValidationIssue = {
			code: 'incompatible_reference',
			path: 'tools.0.workflow',
			capability: { kind: 'tool', id: 'wf-1', index: 0, toolType: 'workflow' },
			reason: 'incompatible_nodes',
		};

		expect(agentValidationIssueMessage(issue, i18n)).toBe(
			'agents.builder.validation.issue.tool.workflow.incompatibleNodes(wf-1)',
		);
	});

	it('ignores an unrecognised reason and keeps the tool-type copy', () => {
		const issue: AgentConfigValidationIssue = {
			code: 'incompatible_reference',
			path: 'tools.0.workflow',
			capability: { kind: 'tool', id: 'wf-1', index: 0, toolType: 'workflow' },
			reason: 'some_future_reason',
		};

		expect(agentValidationIssueMessage(issue, i18n)).toBe(
			'agents.builder.validation.issue.tool.workflow.incompatibleReference(wf-1)',
		);
	});

	it('falls back to the generic code copy for an unmapped kind', () => {
		const issue: AgentConfigValidationIssue = {
			code: 'missing_credential',
			path: 'integrations.0.credentialId',
			capability: { kind: 'channel', id: 'slack', index: 0 },
		};

		expect(agentValidationIssueMessage(issue, i18n)).toBe(
			'agents.builder.validation.issue.missingCredential(slack)',
		);
	});
});

describe('agentValidationIssueLine', () => {
	it('names the element the issue belongs to', () => {
		const issue: AgentConfigValidationIssue = {
			code: 'missing_credential',
			path: 'integrations.0.credentialId',
			capability: { kind: 'channel', id: 'slack', index: 0 },
		};

		expect(agentValidationIssueLine(issue, i18n)).toBe(
			'agents.builder.validation.capability.channel slack: agents.builder.validation.issue.missingCredential(slack)',
		);
	});

	it('falls back to a 1-based position when the element has no id', () => {
		const issue: AgentConfigValidationIssue = {
			code: 'missing_reference',
			path: 'tools.2',
			capability: { kind: 'tool', index: 2, toolType: 'custom' },
		};

		expect(agentValidationIssueLine(issue, i18n)).toBe(
			'agents.builder.validation.capability.tool #3: agents.builder.validation.issue.tool.custom.missingReference',
		);
	});

	it('leaves the agent’s own fields unprefixed — their copy already names the field', () => {
		const issue: AgentConfigValidationIssue = {
			code: 'missing_credential',
			path: 'credential',
			capability: { kind: 'agent' },
		};

		expect(agentValidationIssueLine(issue, i18n)).toBe(
			'agents.builder.validation.issue.agent.credentialMissing',
		);
	});
});
