import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Pool of progress verbs we cycle through while a test case is running.
 * Lifted from the TRUST-70 spec so the running state feels alive instead of
 * just showing a static "Running…".
 */
export const PROGRESS_VERBS = [
	'Accomplishing',
	'Actioning',
	'Actualizing',
	'Architecting',
	'Baking',
	'Beaming',
	"Beboppin'",
	'Befuddling',
	'Billowing',
	'Blanching',
	'Bloviating',
	'Boogieing',
	'Boondoggling',
	'Booping',
	'Bootstrapping',
	'Brewing',
	'Bunning',
	'Burrowing',
	'Calculating',
	'Canoodling',
	'Caramelizing',
	'Cascading',
	'Catapulting',
	'Cerebrating',
	'Channeling',
	'Channelling',
	'Choreographing',
	'Churning',
	'Clauding',
	'Coalescing',
	'Cogitating',
	'Combobulating',
	'Composing',
	'Computing',
	'Concocting',
	'Considering',
	'Contemplating',
	'Cooking',
	'Crafting',
	'Creating',
	'Crunching',
	'Crystallizing',
	'Cultivating',
	'Deciphering',
	'Deliberating',
	'Determining',
	'Dilly-dallying',
	'Discombobulating',
	'Doing',
	'Doodling',
] as const;

const DEFAULT_INTERVAL_MS = 2500;

/**
 * Picks a fresh progress verb every `intervalMs` milliseconds and returns it
 * as a reactive ref. The first verb is randomized so two cards starting at
 * the same time aren't synced.
 */
export function useCyclingVerb(intervalMs: number = DEFAULT_INTERVAL_MS) {
	const pickRandom = () => PROGRESS_VERBS[Math.floor(Math.random() * PROGRESS_VERBS.length)];

	const verb = ref<string>(pickRandom());
	let timer: ReturnType<typeof setInterval> | null = null;

	onMounted(() => {
		timer = setInterval(() => {
			verb.value = pickRandom();
		}, intervalMs);
	});

	onBeforeUnmount(() => {
		if (timer !== null) clearInterval(timer);
		timer = null;
	});

	return verb;
}
