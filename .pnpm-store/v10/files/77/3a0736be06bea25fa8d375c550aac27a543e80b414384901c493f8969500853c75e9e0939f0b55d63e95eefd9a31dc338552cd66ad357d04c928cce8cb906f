import { computed, effect, signal } from '../esm/index.mjs';

globalThis.gc();
const start = process.memoryUsage().heapUsed;

const w = 100;
const h = 100;
const src = signal(1);

for (let i = 0; i < w; i++) {
	let last = src;
	for (let j = 0; j < h; j++) {
		const prev = last;
		last = computed(() => prev.get() + 1);
	}
	effect(() => last.get());
}

src.set(src.get() + 1);

globalThis.gc();
const end = process.memoryUsage().heapUsed;
console.log(`Memory Usage: ${((end - start) / 1024).toFixed(2)} KB`);
