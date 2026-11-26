import { useI18n } from '@n8n/i18n';
import { effectScope, nextTick, ref } from 'vue';

import {
	GENERAL_THINKING_WORD_KEYS,
	THINKING_WORD_ROTATION_MS,
	WORKFLOW_THINKING_WORD_KEYS,
	useThinkingWordRotation,
} from './useThinkingWords';

const i18n = useI18n();
const generalWords = GENERAL_THINKING_WORD_KEYS.map((key) => i18n.baseText(key));
const workflowWords = WORKFLOW_THINKING_WORD_KEYS.map((key) => i18n.baseText(key));

function setup(initial: { active: boolean; building?: boolean; threadId?: string }) {
	const active = ref(initial.active);
	const building = ref(initial.building ?? false);
	const threadId = ref(initial.threadId ?? 'thread-1');
	const scope = effectScope();
	const word = scope.run(() =>
		useThinkingWordRotation({
			active: () => active.value,
			building: () => building.value,
			threadId: () => threadId.value,
		}),
	)!;
	/** The words that show over `count` rotations, the current one first. */
	const collect = (count: number) => {
		const words: Array<string | undefined> = [];
		for (let i = 0; i < count; i++) {
			words.push(word.value);
			vi.advanceTimersByTime(THINKING_WORD_ROTATION_MS);
		}
		return words;
	};
	return { word, active, building, threadId, collect, scope };
}

describe('useThinkingWordRotation', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows no word while the thread is not active', () => {
		const { word } = setup({ active: false });

		expect(word.value).toBeUndefined();
	});

	it('shows a general word while the thread is active', () => {
		const { word } = setup({ active: true });

		expect(generalWords).toContain(word.value);
	});

	it('shows a different word every rotation, also after a long time', () => {
		const { collect } = setup({ active: true });

		const words = collect(generalWords.length * 3);

		words.slice(1).forEach((current, index) => expect(current).not.toBe(words[index]));
	});

	it('shows each general word once before a word repeats', () => {
		const { collect } = setup({ active: true });

		const words = collect(generalWords.length);

		expect(new Set(words)).toEqual(new Set(generalWords));
	});

	it('shows no workflow word while no workflow builds', () => {
		const { collect } = setup({ active: true });

		const words = collect(generalWords.length * 2);

		expect(words.filter((current) => workflowWords.includes(current ?? ''))).toEqual([]);
	});

	it('mixes the workflow words in while a workflow builds', () => {
		const { collect } = setup({ active: true, building: true });

		const words = collect(generalWords.length + workflowWords.length);

		expect(new Set(words)).toEqual(new Set([...generalWords, ...workflowWords]));
	});

	it('does not repeat a word of an earlier run in the same thread', async () => {
		const { active, collect } = setup({ active: true });
		const firstRun = collect(5);
		active.value = false;
		await nextTick();
		active.value = true;
		await nextTick();

		const secondRun = collect(generalWords.length - 5);

		expect(secondRun.filter((current) => firstRun.includes(current))).toEqual([]);
	});

	it('can repeat the words of an earlier thread', async () => {
		const { threadId, active, collect } = setup({ active: true });
		collect(generalWords.length - 1);
		active.value = false;
		threadId.value = 'thread-2';
		await nextTick();
		active.value = true;
		await nextTick();

		const words = collect(generalWords.length);

		expect(new Set(words)).toEqual(new Set(generalWords));
	});

	it('shows no word after the thread stops', async () => {
		const { word, active } = setup({ active: true });

		active.value = false;
		await nextTick();

		expect(word.value).toBeUndefined();
	});
});
