import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

import type { BaseTextKey } from '@n8n/i18n';

/**
 * Pool of i18n keys for the progress verbs we cycle through while a test
 * case is running. The composable returns a key (not the translated value)
 * so the render site translates at use time and respects the active locale.
 * Lifted from the TRUST-70 spec so the running state feels alive instead of
 * just showing a static "Running…".
 */
export const PROGRESS_VERB_KEYS: readonly BaseTextKey[] = [
	'evaluation.runDetail.testCase.progress.accomplishing',
	'evaluation.runDetail.testCase.progress.actioning',
	'evaluation.runDetail.testCase.progress.actualizing',
	'evaluation.runDetail.testCase.progress.architecting',
	'evaluation.runDetail.testCase.progress.baking',
	'evaluation.runDetail.testCase.progress.beaming',
	'evaluation.runDetail.testCase.progress.beboppin',
	'evaluation.runDetail.testCase.progress.befuddling',
	'evaluation.runDetail.testCase.progress.billowing',
	'evaluation.runDetail.testCase.progress.blanching',
	'evaluation.runDetail.testCase.progress.bloviating',
	'evaluation.runDetail.testCase.progress.boogieing',
	'evaluation.runDetail.testCase.progress.boondoggling',
	'evaluation.runDetail.testCase.progress.booping',
	'evaluation.runDetail.testCase.progress.bootstrapping',
	'evaluation.runDetail.testCase.progress.brewing',
	'evaluation.runDetail.testCase.progress.bunning',
	'evaluation.runDetail.testCase.progress.burrowing',
	'evaluation.runDetail.testCase.progress.calculating',
	'evaluation.runDetail.testCase.progress.canoodling',
	'evaluation.runDetail.testCase.progress.caramelizing',
	'evaluation.runDetail.testCase.progress.cascading',
	'evaluation.runDetail.testCase.progress.catapulting',
	'evaluation.runDetail.testCase.progress.cerebrating',
	'evaluation.runDetail.testCase.progress.channeling',
	'evaluation.runDetail.testCase.progress.choreographing',
	'evaluation.runDetail.testCase.progress.churning',
	'evaluation.runDetail.testCase.progress.clauding',
	'evaluation.runDetail.testCase.progress.coalescing',
	'evaluation.runDetail.testCase.progress.cogitating',
	'evaluation.runDetail.testCase.progress.combobulating',
	'evaluation.runDetail.testCase.progress.composing',
	'evaluation.runDetail.testCase.progress.computing',
	'evaluation.runDetail.testCase.progress.concocting',
	'evaluation.runDetail.testCase.progress.considering',
	'evaluation.runDetail.testCase.progress.contemplating',
	'evaluation.runDetail.testCase.progress.cooking',
	'evaluation.runDetail.testCase.progress.crafting',
	'evaluation.runDetail.testCase.progress.creating',
	'evaluation.runDetail.testCase.progress.crunching',
	'evaluation.runDetail.testCase.progress.crystallizing',
	'evaluation.runDetail.testCase.progress.cultivating',
	'evaluation.runDetail.testCase.progress.deciphering',
	'evaluation.runDetail.testCase.progress.deliberating',
	'evaluation.runDetail.testCase.progress.determining',
	'evaluation.runDetail.testCase.progress.dillyDallying',
	'evaluation.runDetail.testCase.progress.discombobulating',
	'evaluation.runDetail.testCase.progress.doing',
	'evaluation.runDetail.testCase.progress.doodling',
] as const;

const DEFAULT_INTERVAL_MS = 2500;

/**
 * Picks a fresh progress-verb i18n key every `intervalMs` while `enabled` is
 * truthy and returns it as a reactive ref. The render site is responsible
 * for translating the key (via `useI18n().baseText(...)`), so locale
 * changes take effect without re-mounting the composable. The first key is
 * randomized so two cards starting at the same time aren't synced. The
 * interval is paused while `enabled` is false to avoid burning timers on
 * idle headers.
 */
export function useCyclingVerb(enabled: Ref<boolean>, intervalMs: number = DEFAULT_INTERVAL_MS) {
	const pickRandom = () =>
		PROGRESS_VERB_KEYS[Math.floor(Math.random() * PROGRESS_VERB_KEYS.length)];

	const verbKey = ref<BaseTextKey>(pickRandom());
	let timer: ReturnType<typeof setInterval> | null = null;

	const stop = () => {
		if (timer !== null) {
			clearInterval(timer);
			timer = null;
		}
	};

	const start = () => {
		if (timer !== null) return;
		verbKey.value = pickRandom();
		timer = setInterval(() => {
			verbKey.value = pickRandom();
		}, intervalMs);
	};

	watch(
		enabled,
		(value) => {
			if (value) start();
			else stop();
		},
		{ immediate: true },
	);

	onBeforeUnmount(stop);

	return verbKey;
}
