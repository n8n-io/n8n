import { describe, it, expect } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';

import { useExclusiveOpen } from './useExclusiveOpen';

function instance() {
	const wantsOpen = ref(false);
	const scope = effectScope();
	const open = scope.run(() => useExclusiveOpen(wantsOpen))!;
	return { wantsOpen, open, scope };
}

describe('useExclusiveOpen', () => {
	it('closes the previous owner as soon as another instance wants to open', async () => {
		const a = instance();
		const b = instance();

		a.wantsOpen.value = true;
		await nextTick();
		expect(a.open.value).toBe(true);

		b.wantsOpen.value = true;
		await nextTick();
		expect(a.open.value).toBe(false);
		expect(b.open.value).toBe(true);

		a.scope.stop();
		b.scope.stop();
	});

	it('keeps a displaced instance closed until it wants to open again', async () => {
		const a = instance();
		const b = instance();

		a.wantsOpen.value = true;
		b.wantsOpen.value = true;
		await nextTick();
		expect(b.open.value).toBe(true);

		b.wantsOpen.value = false;
		await nextTick();
		expect(a.open.value).toBe(false);

		a.wantsOpen.value = false;
		await nextTick();
		a.wantsOpen.value = true;
		await nextTick();
		expect(a.open.value).toBe(true);

		a.scope.stop();
		b.scope.stop();
	});

	it('opens an instance that already wants to open when it is created', async () => {
		const wantsOpen = ref(true);
		const scope = effectScope();
		const open = scope.run(() => useExclusiveOpen(wantsOpen))!;

		expect(open.value).toBe(true);

		scope.stop();
	});

	it('releases the slot when the owner is disposed', async () => {
		const a = instance();
		const b = instance();

		b.wantsOpen.value = true;
		await nextTick();
		b.scope.stop();
		a.wantsOpen.value = true;
		await nextTick();

		expect(a.open.value).toBe(true);

		a.scope.stop();
	});
});
