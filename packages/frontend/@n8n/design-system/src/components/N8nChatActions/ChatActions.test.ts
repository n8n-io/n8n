import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import N8nIcon from '../N8nIcon';
import N8nChatActions from './ChatActions.vue';

const { copy, speak, stop, speechStatus, speechSupported, speechIsPlaying } = vi.hoisted(
	function createMocks() {
		return {
			copy: vi.fn(),
			speak: vi.fn(),
			stop: vi.fn(),
			speechStatus: { value: 'init' as 'init' | 'play' | 'end' },
			speechSupported: { value: true },
			speechIsPlaying: { value: false, __v_isRef: true },
		};
	},
);

vi.mock('@vueuse/core', function mockVueUse() {
	return {
		useClipboard: function useClipboard(options?: { legacy?: boolean }) {
			return { copy, options };
		},
		useSpeechSynthesis: function useSpeechSynthesis() {
			return {
				isSupported: speechSupported,
				isPlaying: speechIsPlaying,
				status: speechStatus,
				speak,
				stop,
			};
		},
	};
});

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
	beforeEach(() => {
		vi.clearAllMocks();
		speechStatus.value = 'init';
		speechSupported.value = true;
		speechIsPlaying.value = false;
	});

	it('copies the content and reports the result', async () => {
		const onCopy = vi.fn();
		const wrapper = mount(N8nChatActions, {
			props: {
				content: 'Message content',
				showReadAloud: false,
				onCopy,
			},
			global,
		});

		await wrapper.get('button').trigger('click');

		expect(copy).toHaveBeenCalledWith('Message content');
		expect(onCopy).toHaveBeenCalledWith({ text: 'Message content', status: 'success' });
		expect(wrapper.get('button').attributes('aria-label')).toBe('Copied');
		expect(wrapper.getComponent(N8nIcon).props('icon')).toBe('check');
	});

	it('reports a failed copy attempt', async () => {
		copy.mockRejectedValueOnce(new Error('Copy failed'));
		const onCopy = vi.fn();
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showReadAloud: false, onCopy },
			global,
		});

		await wrapper.get('button').trigger('click');

		expect(onCopy).toHaveBeenCalledWith({ text: 'Message content', status: 'error' });
	});

	it('starts reading the content aloud', async () => {
		const onReadAloud = vi.fn();
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false, onReadAloud },
			global,
		});

		await wrapper.get('button').trigger('click');

		expect(speak).toHaveBeenCalledTimes(1);
		expect(onReadAloud).toHaveBeenCalledWith({ text: 'Message content', status: 'started' });
	});

	it('stops reading the content aloud', async () => {
		speechStatus.value = 'play';
		speechIsPlaying.value = true;
		const onReadAloud = vi.fn();
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false, onReadAloud },
			global,
		});
		const button = wrapper.get('button');

		expect(button.attributes('data-icon')).toBe('volume-x');
		expect(button.attributes('aria-label')).toBe('Stop reading');
		expect(button.attributes('aria-pressed')).toBe('true');
		await button.trigger('click');

		expect(stop).toHaveBeenCalledTimes(1);
		expect(onReadAloud).toHaveBeenCalledWith({ text: 'Message content', status: 'stopped' });

		speechIsPlaying.value = false;
		await button.trigger('click');

		expect(speak).toHaveBeenCalledTimes(1);
		expect(onReadAloud).toHaveBeenCalledWith({ text: 'Message content', status: 'started' });
	});

	it('hides read aloud when speech synthesis is unavailable', () => {
		speechSupported.value = false;
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content' },
			slots: { default: '<button data-test-id="custom-action">Custom</button>' },
			global,
		});

		expect(wrapper.findAll('button')).toHaveLength(2);
		expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('Message actions');
	});
});
