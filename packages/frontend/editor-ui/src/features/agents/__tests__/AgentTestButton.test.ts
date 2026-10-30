/* eslint-disable import-x/no-extraneous-dependencies -- @vue/test-utils is a transitive devDep */
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const STUBS = {
	AgentValidationTooltip: {
		template: '<span data-testid="validation-tooltip" :data-disabled="disabled"><slot /></span>',
		props: ['disabled', 'fallback', 'action', 'issues'],
	},
};

const restrictedIssue: AgentConfigValidationIssue = {
	code: 'restricted_node_type',
	path: 'tools.0.node.nodeType',
	capability: { kind: 'tool', toolType: 'node', id: 'Post message', index: 0 },
	restriction: { nodeType: 'n8n-nodes-base.slackTool', scope: 'instance' },
};

async function renderComponent(
	props: {
		isRunnable: boolean;
		isPreviewOpen?: boolean;
		disabledReason?: string;
		iconOnly?: boolean;
		validationIssues?: AgentConfigValidationIssue[];
	} = { isRunnable: true },
) {
	const { default: AgentTestButton } = await import('../components/AgentTestButton.vue');
	return mount(AgentTestButton, {
		props: { testId: 'preview-agent-button', ...props },
		global: { stubs: STUBS },
	});
}

// The first mount pays the SFC transform for the button and its tooltip, which runs past the
// default 5 s budget when the whole suite is in flight. Later tests hit the cached module.
vi.setConfig({ testTimeout: 30_000 });

describe('AgentTestButton', () => {
	it('blocks the preview while a policy restricts a tool node type', async () => {
		const wrapper = await renderComponent({
			isRunnable: false,
			validationIssues: [restrictedIssue],
		});

		const button = wrapper.find('[data-testid="preview-agent-button"]');
		expect(button.attributes('aria-disabled')).toBe('true');
		expect(button.attributes('disabled')).toBeUndefined();
		expect(wrapper.find('[data-testid="validation-tooltip"]').attributes('data-disabled')).toBe(
			'false',
		);
	});

	it('passes the restriction to the tooltip so it can name the reason', async () => {
		const wrapper = await renderComponent({
			isRunnable: false,
			validationIssues: [restrictedIssue],
		});

		expect(wrapper.findComponent(STUBS.AgentValidationTooltip).props('issues')).toEqual([
			restrictedIssue,
		]);
		expect(wrapper.findComponent(STUBS.AgentValidationTooltip).props('action')).toBe('preview');
	});

	it('blocks the preview while a policy restricts an MCP server node type', async () => {
		const wrapper = await renderComponent({
			isRunnable: false,
			validationIssues: [
				{
					code: 'restricted_node_type',
					path: 'mcpServers.0',
					capability: { kind: 'mcpServer', id: 'Docs', index: 0 },
					restriction: { nodeType: '@n8n/n8n-nodes-langchain.mcpClientTool', scope: 'project' },
				},
			],
		});

		expect(wrapper.find('[data-testid="preview-agent-button"]').attributes('aria-disabled')).toBe(
			'true',
		);
	});

	it('opens the preview again once the restricted tool is removed', async () => {
		const wrapper = await renderComponent({ isRunnable: true, validationIssues: [] });
		const button = wrapper.find('[data-testid="preview-agent-button"]');

		expect(button.attributes('disabled')).toBeUndefined();

		await button.trigger('click');

		expect(wrapper.emitted('open-preview')).toHaveLength(1);
	});

	it('stays usable while the preview is open, so it can be closed', async () => {
		const wrapper = await renderComponent({
			isRunnable: false,
			isPreviewOpen: true,
			validationIssues: [restrictedIssue],
		});

		const button = wrapper.find('[data-testid="preview-agent-button"]');
		expect(button.attributes('disabled')).toBeUndefined();

		await button.trigger('click');

		expect(wrapper.emitted('close-preview')).toHaveLength(1);
		expect(wrapper.emitted('open-preview')).toBeUndefined();
	});

	it('renders the icon-only variant with the same blocked state', async () => {
		const wrapper = await renderComponent({
			isRunnable: false,
			iconOnly: true,
			validationIssues: [restrictedIssue],
		});

		const toggle = wrapper.find('[data-testid="preview-agent-button"]');
		expect(toggle.attributes('aria-pressed')).toBe('false');
		expect(toggle.attributes('aria-disabled')).toBe('true');
		expect(toggle.attributes('disabled')).toBeUndefined();
	});

	it('prioritizes the working reason over validation issues', async () => {
		const wrapper = await renderComponent({
			isRunnable: false,
			disabledReason: 'Assistant is working',
			validationIssues: [restrictedIssue],
		});

		const tooltip = wrapper.findComponent(STUBS.AgentValidationTooltip);
		expect(tooltip.props('issues')).toEqual([]);
		expect(tooltip.props('fallback')).toBe('Assistant is working');
	});

	it('shows the close label instead of validation issues while the icon-only preview is open', async () => {
		const wrapper = await renderComponent({
			isRunnable: false,
			isPreviewOpen: true,
			iconOnly: true,
			validationIssues: [restrictedIssue],
		});

		const tooltip = wrapper.findComponent(STUBS.AgentValidationTooltip);
		expect(tooltip.props('disabled')).toBe(false);
		expect(tooltip.props('issues')).toEqual([]);
		expect(tooltip.props('fallback')).toBe('agents.builder.preview.close.ariaLabel');
	});
});
