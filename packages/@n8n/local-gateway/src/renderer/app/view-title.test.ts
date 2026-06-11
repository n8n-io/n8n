// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { __resetViewTitlesForTests, activeViewTitle, pushViewTitle } from './view-title';

describe('view-title stack', () => {
	beforeEach(() => {
		__resetViewTitlesForTests();
	});

	it('is empty until a view registers', () => {
		expect(activeViewTitle.value).toBeUndefined();
	});

	it('the most recently pushed view owns the title; releasing reveals the one beneath', () => {
		const releaseSettings = pushViewTitle('Settings');
		const releaseChat = pushViewTitle('Chat');
		expect(activeViewTitle.value?.title).toBe('Chat');

		releaseChat();
		expect(activeViewTitle.value?.title).toBe('Settings');

		releaseSettings();
		expect(activeViewTitle.value).toBeUndefined();
	});

	it('releasing a view below the top removes just that entry', () => {
		const releaseBottom = pushViewTitle('Bottom');
		pushViewTitle('Top');

		releaseBottom();
		releaseBottom(); // double release is a no-op

		expect(activeViewTitle.value?.title).toBe('Top');
	});

	it('resolves reactive titles on read', () => {
		const title = ref('Chat');
		pushViewTitle(() => title.value);

		title.value = 'Renamed thread';
		expect(activeViewTitle.value?.title).toBe('Renamed thread');
	});

	it('exposes the registered back handler', () => {
		const onBack = vi.fn();
		pushViewTitle('Settings', onBack);

		activeViewTitle.value?.onBack?.();
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});
