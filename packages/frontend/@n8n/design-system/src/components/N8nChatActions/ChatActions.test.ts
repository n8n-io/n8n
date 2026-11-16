import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import N8nIcon from '../N8nIcon';
import N8nChatActions from './ChatActions.vue';

const { copy, speak, stop, speechStatus, speechSupported, speechIsPlaying, utterance } = vi.hoisted(
	function createMocks() {
		return {
			copy: vi.fn(),
			speak: vi.fn(),
			stop: vi.fn(),
			speechStatus: { value: 'init' as 'init' | 'play' | 'end' },
			speechSupported: { value: true },
			speechIsPlaying: { value: false, __v_isRef: true },
			utterance: { value: { lang: 'en-US', voice: null as SpeechSynthesisVoice | null } },
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
				utterance,
				speak,
				stop,
			};
		},
	};
});

const getVoices = vi.mocked(window.speechSynthesis.getVoices);

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
		utterance.value.voice = null;
		utterance.value.lang = 'en-US';
		getVoices.mockReturnValue([]);
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

	it.each([
		{ name: 'Samantha', lang: 'en-US', localService: true },
		{ name: 'Daniel', lang: 'en-GB', localService: true },
		{ name: 'Microsoft Zira', lang: 'en-US', localService: true },
		{ name: 'Slt', lang: 'en', localService: true },
		{ name: 'Google US English', lang: 'en-US', localService: false },
	])('uses the default $name voice and its language', async ({ name, lang, localService }) => {
		const defaultVoice = { name, lang, localService, default: true, voiceURI: name };
		getVoices.mockReturnValue([
			{ ...defaultVoice, name: 'English (Premium)', default: false, voiceURI: 'other' },
			defaultVoice,
		]);
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});
		speak.mockImplementationOnce(() => {
			expect(utterance.value.voice).toBe(defaultVoice);
			expect(utterance.value.lang).toBe(lang);
		});

		await wrapper.get('button').trigger('click');

		expect(speak).toHaveBeenCalledTimes(1);
	});

	it('converts the default voice language to a BCP 47 tag', async () => {
		getVoices.mockReturnValue([
			{ name: 'Slt', lang: 'en_US', localService: true, default: true, voiceURI: 'Slt' },
		]);
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});

		await wrapper.get('button').trigger('click');

		expect(utterance.value.lang).toBe('en-US');
	});

	it.each([
		{ reason: 'voices have not loaded', voices: [] },
		{
			reason: 'no voice is marked as the default',
			voices: [
				{
					name: 'Samantha',
					lang: 'en-US',
					localService: true,
					default: false,
					voiceURI: 'Samantha',
				},
			],
		},
	])('lets the browser choose when $reason', async ({ voices }) => {
		getVoices.mockReturnValue(voices);
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});

		await wrapper.get('button').trigger('click');

		expect(utterance.value.voice).toBeNull();
		expect(utterance.value.lang).toBe('en-US');
		expect(speak).toHaveBeenCalledTimes(1);
	});

	it('uses the default voice when voices load after the chat opens', async () => {
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});
		const defaultVoice = {
			name: 'Daniel',
			lang: 'en-GB',
			localService: true,
			default: true,
			voiceURI: 'Daniel',
		};
		getVoices.mockReturnValue([defaultVoice]);

		await wrapper.get('button').trigger('click');

		expect(utterance.value.voice).toBe(defaultVoice);
		expect(utterance.value.lang).toBe('en-GB');
	});

	it('checks the default voice again before each playback', async () => {
		const firstVoice = {
			name: 'Daniel',
			lang: 'en-GB',
			localService: true,
			default: true,
			voiceURI: 'Daniel',
		};
		const secondVoice = { ...firstVoice, name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha' };
		getVoices.mockReturnValue([firstVoice]);
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});

		await wrapper.get('button').trigger('click');
		getVoices.mockReturnValue([secondVoice]);
		await wrapper.get('button').trigger('click');

		expect(utterance.value.voice).toBe(secondVoice);
		expect(utterance.value.lang).toBe('en-US');
		expect(speak).toHaveBeenCalledTimes(2);
	});

	it('clears the selected voice when the default is no longer available', async () => {
		getVoices.mockReturnValue([
			{ name: 'Daniel', lang: 'en-GB', localService: true, default: true, voiceURI: 'Daniel' },
		]);
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});

		await wrapper.get('button').trigger('click');
		getVoices.mockReturnValue([]);
		await wrapper.get('button').trigger('click');

		expect(utterance.value.voice).toBeNull();
		expect(utterance.value.lang).toBe('en-US');
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
