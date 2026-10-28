import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { N8nIcon } from '@n8n/design-system';
import SessionTimelinePill from '../components/SessionTimelinePill.vue';

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
});
