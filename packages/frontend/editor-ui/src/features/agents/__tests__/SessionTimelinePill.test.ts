import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { N8nBadge, N8nIcon } from '@n8n/design-system';
import SessionTimelinePill from '../components/SessionTimelinePill.vue';
import MessageCircleOff from '~icons/lucide/message-circle-off';

enableAutoUnmount(afterEach);

describe('SessionTimelinePill', () => {
	it('shows the event label when requested', () => {
		const wrapper = mount(SessionTimelinePill, {
			props: { kind: 'skill', label: 'Skill', showLabel: true },
		});

		expect(wrapper.text()).toBe('Skill');
		expect(wrapper.getComponent(N8nIcon).props('icon')).toBe('book-open');
	});

	it('keeps the default presentation icon-only', () => {
		const wrapper = mount(SessionTimelinePill, {
			props: { kind: 'skill', label: 'Skill' },
		});

		expect(wrapper.text()).toBe('');
		expect(wrapper.getComponent(N8nIcon).props('icon')).toBe('book-open');
	});

	it('gives the no-reply icon an accessible label', () => {
		const wrapper = mount(SessionTimelinePill, {
			props: { kind: 'tool', toolName: 'do_not_respond', label: 'Do not respond' },
		});

		expect(wrapper.getComponent(MessageCircleOff).attributes('role')).toBe('img');
		expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Do not respond');
		expect(wrapper.text()).toBe('');
		expect(wrapper.findComponent(N8nIcon).exists()).toBe(false);
	});

	it('shows a decorative no-reply icon before the badge label', () => {
		const wrapper = mount(SessionTimelinePill, {
			props: {
				kind: 'tool',
				toolName: 'do_not_respond',
				label: 'Do not respond',
				showLabel: true,
			},
		});
		const badge = wrapper.getComponent(N8nBadge);

		expect(badge.text()).toBe('Do not respond');
		expect(badge.getComponent(MessageCircleOff).attributes('aria-hidden')).toBe('true');
		expect(badge.element.firstElementChild).toBe(badge.getComponent(MessageCircleOff).element);
		expect(wrapper.findComponent(N8nIcon).exists()).toBe(false);
	});
});
