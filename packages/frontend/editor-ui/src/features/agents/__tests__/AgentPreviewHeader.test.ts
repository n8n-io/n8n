/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import AgentPreviewHeader from '../components/AgentPreviewHeader.vue';

vi.mock('@n8n/i18n', function mockI18n() {
	return {
		useI18n: function useI18n() {
			return {
				baseText: function baseText(key: string) {
					return key;
				},
			};
		},
	};
});

vi.mock('@n8n/design-system', function mockDesignSystem() {
	return {
		N8nBreadcrumbs: {
			name: 'N8nBreadcrumbs',
			template:
				'<nav><a :href="items[0].href">{{ items[0].label }}</a><slot name="append" /></nav>',
			props: ['items'],
			emits: ['itemSelected'],
		},
		N8nButton: {
			name: 'N8nButton',
			template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
			emits: ['click'],
		},
		N8nDropdownMenu: {
			name: 'N8nDropdownMenu',
			template: '<div><slot name="trigger" /></div>',
			props: ['items'],
			emits: ['select'],
		},
		N8nIcon: {
			name: 'N8nIcon',
			template: '<i v-bind="$attrs" />',
		},
		N8nIconButton: {
			name: 'N8nIconButton',
			template: '<button v-bind="$attrs" @click="$emit(\'click\')" />',
			emits: ['click'],
		},
		N8nText: {
			name: 'N8nText',
			template: '<span><slot /></span>',
		},
		N8nTooltip: {
			name: 'N8nTooltip',
			template: '<div v-bind="$attrs"><slot /></div>',
		},
	};
});

function mountHeader(hasTrace = true) {
	return mount(AgentPreviewHeader, {
		props: {
			agentName: 'Support agent',
			agentHref: '/projects/project-1/agents/agent-1?continueSessionId=thread-1',
			sessionTitle: 'Customer question',
			sessionOptions: [
				{
					id: 'thread-1',
					title: 'Customer question',
				},
			],
			hasTrace,
		},
	});
}

describe('AgentPreviewHeader', function describeAgentPreviewHeader() {
	it('renders the agent and session names', function testRendering() {
		const wrapper = mountHeader();

		expect(wrapper.text()).toContain('Support agent');
		expect(wrapper.text()).toContain('Customer question');
	});

	it('shows the new-session label when the session title is empty', async function testEmptyTitle() {
		const wrapper = mountHeader();

		await wrapper.setProps({ sessionTitle: '' });

		expect(wrapper.text()).toContain('agents.builder.chat.newChat.label');
	});

	it('keeps the active session in the agent link', function testAgentLink() {
		const wrapper = mountHeader();

		expect(wrapper.get('a').attributes('href')).toBe(
			'/projects/project-1/agents/agent-1?continueSessionId=thread-1',
		);
	});

	it('emits view-trace when the trace action is clicked', async function testViewTrace() {
		const wrapper = mountHeader();
		const traceButton = wrapper.get('[data-testid="agent-preview-view-trace"]');

		expect(traceButton.attributes('aria-label')).toBe('agents.builder.preview.viewSession');
		await traceButton.trigger('click');

		expect(wrapper.emitted('view-trace')).toHaveLength(1);
	});

	it('does not show view trace button when there is no trace', function testNoTrace() {
		const wrapper = mountHeader(false);

		expect(wrapper.find('[data-testid="agent-preview-view-trace"]').exists()).toBe(false);
	});
});
