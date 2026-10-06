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
		{ name: 'Samantha', lang: 'en-US' },
		{ name: 'Microsoft Zira Desktop - English (United States)', lang: 'en-US' },
		{ name: 'Microsoft Zira - English (United States)', lang: 'en-US' },
		{ name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' },
		{ name: 'Slt', lang: 'en' },
		{ name: 'Alan', lang: 'en' },
		{ name: 'Slt', lang: 'en_US' },
	])('selects the local $name voice instead of the system default', async ({ name, lang }) => {
		const defaultVoice = {
			name: 'Zarvox',
			lang: 'en-US',
			localService: true,
			default: true,
			voiceURI: 'Zarvox',
		};
		const preferredVoice = {
			name,
			lang,
			localService: true,
			default: false,
			voiceURI: name,
		};
		getVoices.mockReturnValue([defaultVoice, preferredVoice]);
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});
		speak.mockImplementationOnce(() => {
			expect(utterance.value.voice).toBe(preferredVoice);
		});

		await wrapper.get('button').trigger('click');

		expect(speak).toHaveBeenCalledTimes(1);
	});

	it.each(['Natural', 'Enhanced', 'Premium'])(
		'prefers a local voice labelled %s',
		async (label) => {
			const standardVoice = {
				name: 'Microsoft Zira Desktop - English (United States)',
				lang: 'en-US',
				localService: true,
				default: true,
				voiceURI: 'standard',
			};
			const preferredVoice = {
				...standardVoice,
				name: `English (${label})`,
				default: false,
				voiceURI: 'preferred',
			};
			getVoices.mockReturnValue([standardVoice, preferredVoice]);
			const wrapper = mount(N8nChatActions, {
				props: { content: 'Message content', showCopy: false },
				global,
			});

			await wrapper.get('button').trigger('click');

			expect(utterance.value.voice).toBe(preferredVoice);
		},
	);

	it('keeps a local standard voice when a natural voice is remote', async () => {
		const standardVoice = {
			name: 'Microsoft Zira Desktop - English (United States)',
			lang: 'en-US',
			localService: true,
			default: true,
			voiceURI: 'standard',
		};
		const remoteVoice = {
			...standardVoice,
			name: 'Microsoft Aria Online (Natural) - English (United States)',
			localService: false,
			default: false,
			voiceURI: 'remote',
		};
		getVoices.mockReturnValue([remoteVoice, standardVoice]);
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});

		await wrapper.get('button').trigger('click');

		expect(utterance.value.voice).toBe(standardVoice);
	});

	it.each([
		{ reason: 'voices have not loaded', voices: [] },
		{
			reason: 'the voice is remote',
			voices: [
				{
					name: 'Samantha',
					lang: 'en-US',
					localService: false,
					default: false,
					voiceURI: 'remote',
				},
			],
		},
		{
			reason: 'the language does not match',
			voices: [
				{
					name: 'Samantha',
					lang: 'fr-FR',
					localService: true,
					default: false,
					voiceURI: 'other-language',
				},
			],
		},
	])('uses the browser default when $reason', async ({ voices }) => {
		getVoices.mockReturnValue(voices);
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});

		await wrapper.get('button').trigger('click');

		expect(utterance.value.voice).toBeNull();
		expect(speak).toHaveBeenCalledTimes(1);
	});

	it('uses voices that become available after the chat opens', async () => {
		const wrapper = mount(N8nChatActions, {
			props: { content: 'Message content', showCopy: false },
			global,
		});
		const preferredVoice = {
			name: 'Samantha',
			lang: 'en-US',
			localService: true,
			default: false,
			voiceURI: 'Samantha',
		};
		getVoices.mockReturnValue([preferredVoice]);

		await wrapper.get('button').trigger('click');

		expect(utterance.value.voice).toBe(preferredVoice);
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
