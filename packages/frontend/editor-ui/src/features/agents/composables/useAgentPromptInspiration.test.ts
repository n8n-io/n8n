import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useAgentPromptInspiration } from './useAgentPromptInspiration';
import { AGENT_PROMPT_INSPIRATION_TIMING as TIMING } from '@/app/constants/durations';

const visibility = ref('visible');
const motion = ref('no-preference');
vi.mock('@vueuse/core', () => ({
	useDocumentVisibility: () => visibility,
	usePreferredReducedMotion: () => motion,
}));

describe('useAgentPromptInspiration', () => {
	let scope: ReturnType<typeof effectScope>;
	beforeEach(() => {
		vi.useFakeTimers();
		visibility.value = 'visible';
		motion.value = 'no-preference';
		scope = effectScope();
	});
	afterEach(() => {
		scope.stop();
		vi.useRealTimers();
	});
	function setup(prompts = ref(['Hi', 'Bye']), enabled = ref(true)) {
		const { placeholder } = scope.run(() => useAgentPromptInspiration({ prompts, enabled }))!;
		return { placeholder, prompts, enabled };
	}
	it('types, holds for five seconds, erases, and cycles through all prompts', () => {
		const { placeholder } = setup();
		expect(placeholder.value).toBe('');
		vi.advanceTimersByTime(TIMING.TYPE);
		expect(placeholder.value).toBe('H');
		vi.advanceTimersByTime(TIMING.TYPE);
		expect(placeholder.value).toBe('Hi');
		vi.advanceTimersByTime(TIMING.HOLD - 1);
		expect(placeholder.value).toBe('Hi');
		vi.advanceTimersByTime(1);
		expect(placeholder.value).toBe('H');
		vi.advanceTimersByTime(TIMING.ERASE);
		expect(placeholder.value).toBe('');
		vi.advanceTimersByTime(3 * TIMING.TYPE);
		expect(placeholder.value).toBe('Bye');
		vi.advanceTimersByTime(TIMING.HOLD + 2 * TIMING.ERASE + TIMING.TYPE);
		expect(placeholder.value).toBe('H');
	});
	it('clears the preview while disabled and restarts when enabled', async () => {
		const { placeholder, enabled } = setup();
		vi.advanceTimersByTime(TIMING.TYPE);
		enabled.value = false;
		await nextTick();
		expect(placeholder.value).toBeUndefined();
		expect(vi.getTimerCount()).toBe(0);
		enabled.value = true;
		await nextTick();
		vi.advanceTimersByTime(TIMING.TYPE);
		expect(placeholder.value).toBe('H');
	});
	it('shows a static first prompt for reduced motion', () => {
		motion.value = 'reduce';
		const { placeholder } = setup();
		expect(placeholder.value).toBe('Hi');
		expect(vi.getTimerCount()).toBe(0);
	});
	it('does not run in a hidden browser tab', () => {
		visibility.value = 'hidden';
		const { placeholder } = setup();
		expect(placeholder.value).toBeUndefined();
		expect(vi.getTimerCount()).toBe(0);
	});
	it('cancels active timers when visibility or motion preferences change', async () => {
		const { placeholder } = setup();
		vi.advanceTimersByTime(TIMING.TYPE);
		visibility.value = 'hidden';
		await nextTick();
		expect(placeholder.value).toBeUndefined();
		expect(vi.getTimerCount()).toBe(0);
		visibility.value = 'visible';
		await nextTick();
		vi.advanceTimersByTime(TIMING.TYPE);
		expect(placeholder.value).toBe('H');
		motion.value = 'reduce';
		await nextTick();
		expect(placeholder.value).toBe('Hi');
		expect(vi.getTimerCount()).toBe(0);
	});
	it('handles empty and updated prompt lists', async () => {
		const { placeholder, prompts } = setup(ref(['']));
		expect(placeholder.value).toBeUndefined();
		expect(vi.getTimerCount()).toBe(0);
		prompts.value = ['Next'];
		await nextTick();
		vi.advanceTimersByTime(TIMING.TYPE);
		expect(placeholder.value).toBe('N');
	});
	it('types complete Unicode characters and cleans up on disposal', () => {
		const { placeholder } = setup(ref(['👋 Hi']));
		vi.advanceTimersByTime(TIMING.TYPE);
		expect(placeholder.value).toBe('👋');
		scope.stop();
		expect(vi.getTimerCount()).toBe(0);
	});
});
