import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ChatResourceLink from './ChatResourceLink.vue';

function click(element: Element, init: MouseEventInit = {}) {
	const event = new MouseEvent('click', { cancelable: true, button: 0, ...init });
	element.dispatchEvent(event);
	return event;
}

describe('ChatResourceLink', () => {
	it.each(['credential', 'data-table', 'agent'])('builds project URLs for %s', (type) => {
		const wrapper = mount(ChatResourceLink, {
			props: {
				href: `n8n-resource://${type}/abc`,
				label: 'Resource',
				resources: [{ type, id: 'abc', name: 'Resource', projectId: 'p1' }],
			},
		});
		const segment = type === 'data-table' ? 'datatables' : `${type}s`;
		expect(wrapper.attributes('href')).toBe(`/projects/p1/${segment}/abc`);
	});

	it('switches workflow previews and keeps new-tab fallback', () => {
		const openWorkflowPreview = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
		const wrapper = mount(ChatResourceLink, {
			props: { href: 'n8n-resource://workflow/abc', label: 'Workflow', openWorkflowPreview },
		});
		expect(click(wrapper.element).defaultPrevented).toBe(true);
		expect(openWorkflowPreview).toHaveBeenCalledWith('abc');
		expect(click(wrapper.element).defaultPrevented).toBe(false);
		expect(wrapper.attributes('target')).toBe('_blank');
		expect(wrapper.attributes('rel')).toBe('noopener noreferrer');
	});

	it.each([
		'/projects/project-1/agents/agent-1/preview?continueSessionId=session-1&source=assistant',
		'/projects/project-1/agents/agent-1?continueSessionId=session-1&source=assistant&openPreview=true',
	])('rewrites the Preview target and keeps query parameters for %s', (href) => {
		const openAgentChatPreview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: {
				href,
				label: 'Preview',
				agentPreviewTarget: { agentId: 'agent-2', projectId: 'project-2' },
				openAgentChatPreview,
			},
		});

		expect(wrapper.attributes('href')).toBe(
			'/projects/project-2/agents/agent-2?continueSessionId=session-1&source=assistant&openPreview=true',
		);
		expect(wrapper.attributes('target')).toBeUndefined();
		expect(wrapper.attributes('data-agent-preview-id')).toBe('agent-2');
		expect(click(wrapper.element).defaultPrevented).toBe(true);
		expect(openAgentChatPreview).toHaveBeenCalledExactlyOnceWith('agent-2', 'project-2');
	});

	it.each(['metaKey', 'ctrlKey', 'shiftKey', 'altKey'])('keeps native %s clicks', (key) => {
		const openWorkflowPreview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: { href: 'n8n-resource://workflow/abc', label: 'Workflow', openWorkflowPreview },
		});
		expect(click(wrapper.element, { [key]: true }).defaultPrevented).toBe(false);
		expect(openWorkflowPreview).not.toHaveBeenCalled();
	});

	it.each([
		['data-table', 'openDataTablePreview'],
		['agent', 'openAgentPreview'],
	] as const)('switches %s previews', (type, callback) => {
		const preview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: {
				href: `n8n-resource://${type}/abc`,
				label: 'Resource',
				resources: [{ type, id: 'abc', name: 'Resource', projectId: 'p1' }],
				[callback]: preview,
			},
		});
		expect(click(wrapper.element).defaultPrevented).toBe(true);
		expect(preview).toHaveBeenCalledWith('abc', 'p1');
	});

	it.each([
		['/workflow/abc', 'workflow'],
		['/projects/p1/credentials/abc', 'credential'],
		['/home/datatables', 'data-table'],
		['/projects/p1/agents/abc', 'agent'],
		['https://example.org/workflow/abc', undefined],
		['//example.org/home/agents', undefined],
		['relative/path', undefined],
	])('recognizes %s', (href, type) => {
		const wrapper = mount(ChatResourceLink, { props: { href, label: 'Resource' } });
		expect(wrapper.attributes('data-resource-chip')).toBe(type);
	});
});
