import { TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { effectScope, nextTick, ref } from 'vue';

import { useMenuTriggerTooltip } from '../useMenuTriggerTooltip';

describe('useMenuTriggerTooltip', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('turns the tooltip off while the menu is open and for a moment after it closes', async () => {
		const open = ref(false);
		const scope = effectScope();
		const { isTooltipDisabled } = scope.run(() => useMenuTriggerTooltip(open))!;
		expect(isTooltipDisabled.value).toBe(false);

		open.value = true;
		await nextTick();
		expect(isTooltipDisabled.value).toBe(true);

		open.value = false;
		await nextTick();
		expect(isTooltipDisabled.value).toBe(true);

		vi.advanceTimersByTime(TOOLTIP_DELAY_MS + 100);
		expect(isTooltipDisabled.value).toBe(false);
		scope.stop();
	});
});
