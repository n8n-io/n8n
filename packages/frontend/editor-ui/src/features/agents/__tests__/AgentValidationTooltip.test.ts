/* eslint-disable import-x/no-extraneous-dependencies -- @vue/test-utils is a transitive devDep */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { AgentConfigValidationIssue, AgentJsonConfig } from '@n8n/api-types';

import AgentValidationTooltip from '../components/AgentValidationTooltip.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const STUBS = {
	// Renders both slots unconditionally so the tooltip's issue list can be
	// asserted without depending on hover/visibility behavior.
	N8nTooltip: {
		template: '<div><slot name="content" /><slot /></div>',
	},
};

const missingCredentialIssue: AgentConfigValidationIssue = {
	code: 'missing_credential',
	path: 'tools.0.node.credentials.slackApi',
	capability: { kind: 'tool', id: 'send_message', index: 0, toolType: 'node' },
};

function configWithMockedTool(mockEnabled: boolean): AgentJsonConfig {
	return {
		name: 'Support Agent',
		model: 'openai/gpt-4o',
		credential: 'openai-main',
		instructions: 'Help users',
		tools: [
			{
				type: 'node',
				name: 'send_message',
				node: { nodeType: 'n8n-nodes-base.slackTool', nodeTypeVersion: 1, nodeParameters: {} },
				...(mockEnabled ? { mock: { enabled: true, items: [{ ok: true }] } } : {}),
			},
		],
	};
}

function render(props: {
	action: 'publish' | 'preview';
	issues: AgentConfigValidationIssue[];
	agentConfig?: AgentJsonConfig | null;
}) {
	return mount(AgentValidationTooltip, {
		props: { disabled: false, fallback: 'fallback', ...props },
		global: { stubs: STUBS },
	});
}

describe('AgentValidationTooltip — mocked-tool credential hint (AGENT-716)', () => {
	it('appends the mocked-tool hint for a publish-blocking missing_credential on a mock-enabled node tool', () => {
		const wrapper = render({
			action: 'publish',
			issues: [missingCredentialIssue],
			agentConfig: configWithMockedTool(true),
		});

		expect(wrapper.text()).toContain('agents.builder.validation.mockedToolCredentialHint');
	});

	it('does not append the hint when the tool is not mock-enabled', () => {
		const wrapper = render({
			action: 'publish',
			issues: [missingCredentialIssue],
			agentConfig: configWithMockedTool(false),
		});

		expect(wrapper.text()).not.toContain('agents.builder.validation.mockedToolCredentialHint');
	});

	it('does not append the hint for the preview action, even on a mock-enabled tool', () => {
		const wrapper = render({
			action: 'preview',
			issues: [missingCredentialIssue],
			agentConfig: configWithMockedTool(true),
		});

		expect(wrapper.text()).not.toContain('agents.builder.validation.mockedToolCredentialHint');
	});

	it('does not append the hint when no agent config is provided', () => {
		const wrapper = render({ action: 'publish', issues: [missingCredentialIssue] });

		expect(wrapper.text()).not.toContain('agents.builder.validation.mockedToolCredentialHint');
	});
});
