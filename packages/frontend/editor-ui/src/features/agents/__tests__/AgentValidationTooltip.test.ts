/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { AgentConfigValidationIssue } from '@n8n/api-types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('../utils/workflowToolTriggers', () => ({
	workflowToolTriggerLabel: () => 'When chat message received',
}));

vi.mock('@n8n/design-system', () => ({
	N8nTooltip: {
		name: 'N8nTooltip',
		template:
			'<span data-testid="stub-tooltip" :data-disabled="disabled" :data-content="content"><slot /><span data-testid="stub-tooltip-content"><slot name="content" /></span></span>',
		props: ['disabled', 'content', 'contentClass'],
	},
}));

import AgentValidationTooltip from '../components/AgentValidationTooltip.vue';

function mountTooltip(props: {
	action: 'publish' | 'preview';
	issues?: AgentConfigValidationIssue[];
	disabled?: boolean;
	fallback?: string;
}) {
	return mount(AgentValidationTooltip, {
		props: {
			disabled: false,
			fallback: 'agents.builder.preview.disabledTooltip',
			issues: [],
			...props,
		},
		slots: {
			default: '<button data-testid="trigger">Trigger</button>',
		},
	});
}

describe('AgentValidationTooltip', () => {
	it('renders preview-specific copy for missing instructions without capability-prefixed bullets', () => {
		const wrapper = mountTooltip({
			action: 'preview',
			issues: [{ code: 'missing_required', path: 'instructions', capability: { kind: 'agent' } }],
		});

		const content = wrapper.get('[data-testid="stub-tooltip-content"]');

		expect(content.text()).toContain('agents.builder.preview.disabledTooltip');
		expect(content.text()).toContain(
			'agents.builder.preview.issue.agent.instructions.missingRequired',
		);
		expect(content.text()).not.toContain('agents.chat.misconfigured.missing.instructions:');
		expect(wrapper.findAll('li')).toHaveLength(0);
	});

	it('filters out preview-excluded issues', () => {
		const wrapper = mountTooltip({
			action: 'preview',
			issues: [
				{ code: 'missing_required', path: 'instructions', capability: { kind: 'agent' } },
				{
					code: 'missing_credential',
					path: 'integrations.0.credentialId',
					capability: { kind: 'channel' },
				},
				{
					code: 'invalid_value',
					path: 'tasks.0',
					capability: { kind: 'task', id: 'task-1', index: 0 },
				},
				{
					code: 'incompatible_reference',
					path: 'tools.0.workflowId',
					capability: { kind: 'tool', toolType: 'workflow', id: 'Draft Flow', index: 0 },
					reason: 'not_published',
				},
				{
					code: 'invalid_value',
					path: 'tools.0.node.nodeParameters.url',
					capability: { kind: 'tool', toolType: 'node', id: 'http_request', index: 0 },
				},
			],
		});

		const content = wrapper.get('[data-testid="stub-tooltip-content"]').text();

		expect(content).toContain('agents.builder.preview.issue.agent.instructions.missingRequired');
		expect(content).not.toContain(
			'agents.builder.preview.issue.tool.workflow.incompatibleReference',
		);
		expect(content).not.toContain('agents.builder.validation.issue.httpRequestUrlFromAi');
		expect(content).not.toContain('agents.builder.tasks.title');
		expect(content).not.toContain('agents.builder.triggers.title');
	});

	it('uses reason-specific preview copy for workflow incompatibilities', () => {
		const wrapper = mountTooltip({
			action: 'preview',
			issues: [
				{
					code: 'incompatible_reference',
					path: 'tools.0.workflow',
					capability: { kind: 'tool', toolType: 'workflow', id: 'Has Wait', index: 0 },
					reason: 'incompatible_nodes',
				},
				{
					code: 'incompatible_reference',
					path: 'tools.1.workflow',
					capability: { kind: 'tool', toolType: 'workflow', id: 'No Trigger', index: 1 },
					reason: 'no_supported_trigger',
				},
			],
		});

		const content = wrapper.get('[data-testid="stub-tooltip-content"]').text();

		expect(content).toContain('agents.builder.preview.issue.tool.workflow.incompatibleNodes');
		expect(content).toContain('agents.builder.preview.issue.tool.workflow.noSupportedTrigger');
	});

	it('falls back to the generic resolver for unknown preview issue combinations', () => {
		const wrapper = mountTooltip({
			action: 'preview',
			issues: [{ code: 'missing_required', path: 'futureField', capability: { kind: 'agent' } }],
		});

		expect(wrapper.get('[data-testid="stub-tooltip-content"]').text()).toContain(
			'agents.chat.misconfigured.missing.agent: agents.builder.validation.issue.missingRequired',
		);
	});

	it('renders publish-specific copy without capability-prefixed bullets', () => {
		const wrapper = mountTooltip({
			action: 'publish',
			issues: [{ code: 'missing_required', path: 'instructions', capability: { kind: 'agent' } }],
			fallback: 'agents.publish.button.invalidConfigTooltip',
		});

		const content = wrapper.get('[data-testid="stub-tooltip-content"]').text();

		expect(content).toContain('agents.publish.button.invalidConfigTooltip');
		expect(content).toContain('agents.publish.issue.agent.instructions.missingRequired');
		expect(content).not.toContain('agents.chat.misconfigured.missing.instructions:');
		expect(wrapper.findAll('li')).toHaveLength(0);
	});

	it('uses publish-specific copy for publish-only workflow validation issues', () => {
		const wrapper = mountTooltip({
			action: 'publish',
			issues: [
				{
					code: 'incompatible_reference',
					path: 'tools.0.workflowId',
					capability: { kind: 'tool', toolType: 'workflow', id: 'Draft Flow', index: 0 },
					reason: 'not_published',
				},
			],
			fallback: 'agents.publish.button.invalidConfigTooltip',
		});

		expect(wrapper.get('[data-testid="stub-tooltip-content"]').text()).toContain(
			'agents.publish.issue.tool.workflow.notPublished',
		);
	});
});
