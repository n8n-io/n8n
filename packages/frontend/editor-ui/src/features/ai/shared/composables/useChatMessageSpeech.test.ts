import { mount } from '@vue/test-utils';
import type { Ref } from 'vue';
import { computed, defineComponent, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatMessageSpeech } from './useChatMessageSpeech';

interface SpeechMock {
	status: Ref<string>;
	isSupported: Ref<boolean>;
	speak: ReturnType<typeof vi.fn>;
	stop: ReturnType<typeof vi.fn>;
}

const speechMocks = vi.hoisted(function createSpeechMocks() {
	return { instances: Array<SpeechMock>() };
});

vi.mock('@vueuse/core', async function mockVueUse() {
	const vue = await import('vue');

	return {
		useSpeechSynthesis: function useSpeechSynthesis() {
			const status = vue.ref('init');
			const speechMock: SpeechMock = {
				status,
				isSupported: vue.ref(true),
				speak: vi.fn(function speak() {
					status.value = 'play';
				}),
				stop: vi.fn(function stop() {
					status.value = 'end';
				}),
			};
			speechMocks.instances.push(speechMock);
			return speechMock;
		},
	};
});

const SpeechConsumer = defineComponent({
	props: {
		messageId: { type: String, required: true },
		content: { type: String, required: true },
	},
	setup(props) {
		const content = ref(props.content);
		const { isSupported, isSpeaking, toggle } = useChatMessageSpeech({
			getText: function getText(messageId) {
				return messageId === props.messageId ? content.value : '';
			},
		});
		const speaking = computed(function getSpeakingState() {
			return isSpeaking(props.messageId);
		});

		function toggleSpeech() {
			toggle(props.messageId);
		}

		return { isSupported, speaking, toggleSpeech };
	},
	template:
		'<button :data-speaking="speaking" :data-supported="isSupported" @click="toggleSpeech" />',
});

describe('useChatMessageSpeech', function describeUseChatMessageSpeech() {
	beforeEach(function resetSpeechMocks() {
		speechMocks.instances.length = 0;
	});

	it('stops other speech, tracks the active message, and cleans up', async function manageSpeech() {
		const first = mount(SpeechConsumer, {
			props: { messageId: 'first', content: 'First response' },
		});
		const second = mount(SpeechConsumer, {
			props: { messageId: 'second', content: 'Second response' },
		});

		await first.trigger('click');
		expect(first.attributes('data-speaking')).toBe('true');
		expect(second.attributes('data-speaking')).toBe('false');

		await second.trigger('click');
		expect(speechMocks.instances[0].stop).toHaveBeenCalledTimes(1);
		expect(first.attributes('data-speaking')).toBe('false');
		expect(second.attributes('data-speaking')).toBe('true');

		speechMocks.instances[1].status.value = 'end';
		await nextTick();
		expect(second.attributes('data-speaking')).toBe('false');

		await first.trigger('click');
		first.unmount();
		expect(speechMocks.instances[0].stop).toHaveBeenCalledTimes(2);
		second.unmount();
	});
});
