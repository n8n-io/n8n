import { describe, it, expect, vi } from 'vitest';
import { effect, ref } from 'vue';

import { structuralComputed } from './structuralComputed';

describe('structuralComputed', () => {
	it('evaluates the derivation lazily — not until .value is read', () => {
		const derive = vi.fn(() => 42);
		const trigger = ref(0);

		const r = structuralComputed(() => {
			// Subscribe to a reactive dep so we can later invalidate the cache.
			void trigger.value;
			return derive();
		});

		expect(derive).not.toHaveBeenCalled();
		expect(r.value).toBe(42);
		expect(derive).toHaveBeenCalledTimes(1);
	});

	it('returns the cached reference when the new value is deeply equal', () => {
		const trigger = ref(0);

		const r = structuralComputed<{ items: number[] }>(
			() => {
				void trigger.value;
				return { items: [1, 2, 3] };
			},
			(a, b) => a.items.length === b.items.length && a.items.every((v, i) => v === b.items[i]),
		);

		const first = r.value;
		trigger.value++;
		const second = r.value;

		expect(second).toBe(first);
	});

	it('updates the cached reference when the new value differs', () => {
		const trigger = ref(0);

		const r = structuralComputed<{ items: number[] }>(
			() => {
				const t = trigger.value;
				return { items: [t] };
			},
			(a, b) => a.items.length === b.items.length && a.items.every((v, i) => v === b.items[i]),
		);

		const first = r.value;
		expect(first).toEqual({ items: [0] });

		trigger.value = 1;
		const second = r.value;

		expect(second).not.toBe(first);
		expect(second).toEqual({ items: [1] });
	});

	it('defaults to Object.is for equality when no isEqual is provided', () => {
		const trigger = ref(0);
		const obj = { stable: true };

		const r = structuralComputed(() => {
			void trigger.value;
			return obj;
		});

		const first = r.value;
		trigger.value++;
		const second = r.value;

		// Same reference both times — `derive` returned the same object.
		expect(second).toBe(first);
	});

	it('does not notify subscribers when the value is structurally equal', () => {
		const trigger = ref(0);

		const r = structuralComputed<{ items: number[] }>(
			() => {
				void trigger.value;
				return { items: [1, 2, 3] };
			},
			(a, b) => a.items.length === b.items.length && a.items.every((v, i) => v === b.items[i]),
		);

		const observer = vi.fn();
		effect(() => {
			observer(r.value);
		});
		expect(observer).toHaveBeenCalledTimes(1);

		trigger.value++;
		expect(observer).toHaveBeenCalledTimes(1); // unchanged
	});

	it('notifies subscribers when the value changes', () => {
		const trigger = ref(0);

		const r = structuralComputed<{ count: number }>(
			() => ({ count: trigger.value }),
			(a, b) => a.count === b.count,
		);

		const observer = vi.fn();
		effect(() => {
			observer(r.value);
		});
		expect(observer).toHaveBeenCalledTimes(1);

		trigger.value = 1;
		expect(observer).toHaveBeenCalledTimes(2);
	});
});
