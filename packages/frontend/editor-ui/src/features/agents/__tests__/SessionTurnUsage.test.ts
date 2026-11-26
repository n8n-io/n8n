import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import SessionTurnUsage from '../components/timeline-items/SessionTurnUsage.vue';
import { SESSION_TIMELINE_SHOW_COST_KEY } from '../components/agentChatInjectionKeys';
import type { TimelineTurnUsage } from '../session-timeline.types';

enableAutoUnmount(afterEach);

// Render the card in place, so the test reads it without hovering.
const hoverCardStub = {
	template: '<div><slot name="trigger" /><slot name="content" :close="() => {}" /></div>',
};

const usage: TimelineTurnUsage = {
	inputTokens: 126_800,
	cacheReadTokens: 94_830,
	cacheWriteTokens: 31_920,
	outputTokens: 808,
	totalTokens: 127_608,
	cost: 0.0974,
	startedAt: 0,
	stoppedAt: 9_050,
};

function mountUsage(props: Partial<TimelineTurnUsage> = {}, showCost?: boolean) {
	return mount(SessionTurnUsage, {
		props: { usage: { ...usage, ...props } },
		global: {
			stubs: { N8nHoverCard: hoverCardStub },
			provide: showCost === undefined ? {} : { [SESSION_TIMELINE_SHOW_COST_KEY]: () => showCost },
		},
	});
}

describe('SessionTurnUsage', () => {
	it('shows the compact token count of the turn', () => {
		const wrapper = mountUsage();

		expect(wrapper.get('[data-testid="session-turn-usage"]').text()).toBe('127.6K');
	});

	it('breaks the input down into cache reads, cache writes and uncached tokens', () => {
		const detail = mountUsage().get('[data-testid="session-turn-usage-detail"]').text();

		expect(detail).toContain('9.1s');
		// Cache read: 94,830 of 126,800 input tokens.
		expect(detail).toContain('75%');
		expect(detail).not.toContain('agentSessions.timeline.usage.cacheHitRate');
		expect(detail).toContain('94,830');
		expect(detail).toContain('31,920');
		// Not cached: 126,800 - 94,830 - 31,920.
		expect(detail).toContain('50');
		expect(detail).toContain('808');
		expect(detail).toContain('127,608');
		expect(detail).toContain('$0.0974');
	});

	it('hides the cost when the host asks for it', () => {
		const detail = mountUsage({}, false).get('[data-testid="session-turn-usage-detail"]').text();

		expect(detail).not.toContain('$');
		expect(detail).toContain('127,608');
	});

	it('says so when the model reported no cache data', () => {
		const detail = mountUsage({ cacheReadTokens: null, cacheWriteTokens: null })
			.get('[data-testid="session-turn-usage-detail"]')
			.text();

		expect(detail).toContain('The model reported no prompt cache data for this turn.');
		expect(detail).not.toContain('Cache hit rate');
	});
});
