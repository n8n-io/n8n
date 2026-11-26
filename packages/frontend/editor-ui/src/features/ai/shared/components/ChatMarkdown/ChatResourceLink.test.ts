import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ChatResourceLink from './ChatResourceLink.vue';

function click(element: Element, init: MouseEventInit = {}) {
	const event = new MouseEvent('click', { cancelable: true, button: 0, ...init });
	element.dispatchEvent(event);
	return event;
}

describe('ChatResourceLink', () => {
	it.each(['workflow', 'credential', 'data-table', 'agent'])('encodes %s resource IDs', (type) => {
		const id = 'wf/1?#%';
		const wrapper = mount(ChatResourceLink, {
			props: {
				href: `n8n-resource://${type}/${encodeURIComponent(id)}`,
				label: 'Resource',
				resources: [{ type, id, name: 'Resource', projectId: 'p1' }],
			},
		});
		const segment = type === 'data-table' ? 'datatables' : `${type}s`;
		const prefix = type === 'workflow' ? '/workflow' : `/projects/p1/${segment}`;
		expect(wrapper.attributes('href')).toBe(`${prefix}/${encodeURIComponent(id)}`);
	});

	it.each([
		{ metaKey: true },
		{ ctrlKey: true },
		{ shiftKey: true },
		{ altKey: true },
		{ button: 1 },
	])('keeps native agent preview clicks for %o', (init) => {
		const openAgentChatPreview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: {
				href: '/projects/p1/agents/a1/preview',
				label: 'Preview',
				openAgentChatPreview,
			},
		});
		expect(click(wrapper.element, init).defaultPrevented).toBe(false);
		expect(openAgentChatPreview).not.toHaveBeenCalled();
	});

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

	it('opens the preview for an app link to a known workflow', () => {
		const openWorkflowPreview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: {
				href: '/workflow/abc',
				label: 'Workflow',
				resources: [{ type: 'workflow', id: 'abc', name: 'Workflow' }],
				openWorkflowPreview,
			},
		});
		expect(click(wrapper.element).defaultPrevented).toBe(true);
		expect(openWorkflowPreview).toHaveBeenCalledWith('abc');
	});

	it('opens the preview for an app link to a known data table with the project of the path', () => {
		const openDataTablePreview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: {
				href: '/projects/p1/datatables/dt1',
				label: 'Table',
				resources: [{ type: 'data-table', id: 'dt1', name: 'Table' }],
				openDataTablePreview,
			},
		});
		expect(click(wrapper.element).defaultPrevented).toBe(true);
		expect(openDataTablePreview).toHaveBeenCalledWith('dt1', 'p1');
	});

	it('opens the preview for an app link to a known agent with the project of the path', () => {
		const openAgentPreview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: {
				href: '/projects/p1/agents/a1',
				label: 'Agent',
				resources: [{ type: 'agent', id: 'a1', name: 'Agent' }],
				openAgentPreview,
			},
		});
		expect(click(wrapper.element).defaultPrevented).toBe(true);
		expect(openAgentPreview).toHaveBeenCalledWith('a1', 'p1');
	});

	it('opens the preview for an app link to a known app', () => {
		const openAppPreview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: {
				href: '/projects/p1/apps/app1',
				label: 'App',
				resources: [{ type: 'app', id: 'app1', name: 'App' }],
				openAppPreview,
			},
		});
		expect(click(wrapper.element).defaultPrevented).toBe(true);
		expect(openAppPreview).toHaveBeenCalledWith('app1');
	});

	it.each([
		{ href: '/workflow/abc/debug/exec-1', type: 'workflow', id: 'abc' },
		{ href: '/workflow/abc/executions', type: 'workflow', id: 'abc' },
		{ href: '/projects/p1/agents/a1/sessions/s1', type: 'agent', id: 'a1' },
	])('keeps the sub-page link $href of a known resource', ({ href, type, id }) => {
		const openWorkflowPreview = vi.fn(() => true);
		const openAgentPreview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: {
				href,
				label: 'Sub-page',
				resources: [{ type, id, name: 'Resource' }],
				openWorkflowPreview,
				openAgentPreview,
			},
		});
		expect(click(wrapper.element).defaultPrevented).toBe(false);
		expect(openWorkflowPreview).not.toHaveBeenCalled();
		expect(openAgentPreview).not.toHaveBeenCalled();
	});

	it('keeps the new tab for an app link to a resource that the thread does not know', () => {
		const openWorkflowPreview = vi.fn(() => true);
		const wrapper = mount(ChatResourceLink, {
			props: {
				href: '/workflow/other',
				label: 'Workflow',
				resources: [{ type: 'workflow', id: 'abc', name: 'Workflow' }],
				openWorkflowPreview,
			},
		});
		expect(click(wrapper.element).defaultPrevented).toBe(false);
		expect(openWorkflowPreview).not.toHaveBeenCalled();
		expect(wrapper.attributes('target')).toBe('_blank');
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
