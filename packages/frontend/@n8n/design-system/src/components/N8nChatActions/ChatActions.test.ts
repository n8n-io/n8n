import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import N8nChatActions from './ChatActions.vue';

const global = {
	stubs: {
		N8nTooltip: {
			props: ['content'],
			template: '<div :data-tooltip="content"><slot /></div>',
		},
		N8nIconButton: {
			props: ['icon'],
			emits: ['click'],
			template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
		},
	},
};

describe('N8nChatActions', () => {
	it('emits built-in actions and renders custom actions after them', async () => {
		const wrapper = mount(N8nChatActions, {
			props: {
				copyLabel: 'Copy response',
				copyTestId: 'copy-action',
				readAloudLabel: 'Read response aloud',
				readAloudTestId: 'read-aloud-action',
			},
			slots: {
				default: '<button data-test-id="custom-action">Custom</button>',
			},
			global,
		});

		const buttons = wrapper.findAll('button');
		expect(buttons).toHaveLength(3);
		expect(buttons[0].attributes('aria-label')).toBe('Copy response');
		expect(buttons[0].attributes('data-test-id')).toBe('copy-action');
		expect(buttons[1].attributes('aria-label')).toBe('Read response aloud');
		expect(buttons[1].attributes('data-test-id')).toBe('read-aloud-action');
		expect(buttons[2].attributes('data-test-id')).toBe('custom-action');

		await buttons[0].trigger('click');
		await buttons[1].trigger('click');

		expect(wrapper.emitted('copy')).toHaveLength(1);
		expect(wrapper.emitted('readAloud')).toHaveLength(1);
	});

	it('renders the stop-reading state as an accessible pressed button', () => {
		const wrapper = mount(N8nChatActions, {
			props: {
				showCopy: false,
				readAloudLabel: 'Read response aloud',
				stopReadingLabel: 'Stop reading response',
				isReadingAloud: true,
			},
			global,
		});

		const button = wrapper.get('button');
		expect(button.attributes('data-icon')).toBe('volume-x');
		expect(button.attributes('aria-label')).toBe('Stop reading response');
		expect(button.attributes('aria-pressed')).toBe('true');
	});

	it('can hide both built-in actions and render only a custom action', () => {
		const wrapper = mount(N8nChatActions, {
			props: {
				showCopy: false,
				showReadAloud: false,
			},
			slots: {
				default: '<button data-test-id="custom-action">Custom</button>',
			},
			global,
		});

		expect(wrapper.findAll('button')).toHaveLength(1);
		expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('Message actions');
	});
});
