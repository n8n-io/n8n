import { run, bench, boxplot } from 'mitata';
import { computed, effect, signal } from '../esm/index.mjs';

boxplot(() => {
	bench('complex: $w * $h', function* (state) {
		const w = state.get('w');
		const h = state.get('h');
		const src = signal({ w, h });
		for (let i = 0; i < w; i++) {
			let last = src;
			for (let j = 0; j < h; j++) {
				const prev = last;
				last = computed(() => ({ [`${i}-${j}`]: prev.get() }));
			}
			effect(() => last.get());
		}

		yield () => src.set({ upstream: src.get() });
	})
		.args('h', [1, 10, 100])
		.args('w', [1, 10, 100]);
});

run({ format: 'markdown' });
