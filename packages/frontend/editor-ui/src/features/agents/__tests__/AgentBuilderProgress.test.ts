import { waitFor } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentSseEvent } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';

import AgentBuilderProgress from '../components/AgentBuilderProgress.vue';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

/** Build a `Response` whose body streams the given events as SSE `data:` lines. */
function makeSseResponse(events: AgentSseEvent[]): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const ev of events) {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
			}
			controller.close();
		},
	});
	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	});
}

/** Build a `Response` whose SSE body is fed manually via the returned `push`/`close`. */
function makeControlledSseResponse() {
	const encoder = new TextEncoder();
	let controller!: ReadableStreamDefaultController<Uint8Array>;
	const stream = new ReadableStream<Uint8Array>({
		start(c) {
			controller = c;
		},
	});
	return {
		response: new Response(stream, {
			status: 200,
			headers: { 'Content-Type': 'text/event-stream' },
		}),
		push(ev: AgentSseEvent) {
			controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
		},
		close() {
			controller.close();
		},
	};
}

/** Each `tool-call` event pushes exactly one `→ Tool N` line into the log. */
function toolCallEvents(count: number): AgentSseEvent[] {
	return Array.from({ length: count }, (_, i) => ({
		type: 'tool-call' as const,
		toolCallId: `tc-${i}`,
		toolName: `tool_${i}`,
		input: {},
	}));
}

const renderComponent = createComponentRenderer(AgentBuilderProgress, {
	props: { projectId: 'p1', agentId: 'a1', initialMessage: 'build me an agent' },
});

const getLogBox = (container: Element) => container.querySelector('[aria-live="polite"]');

describe('AgentBuilderProgress — log box top fade', () => {
	let originalFetch: typeof fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('keeps the first log line fully visible (no top fade) while no lines have been dropped', async () => {
		// 7 lines = MAX_LINES exactly — at capacity but nothing dropped yet
		globalThis.fetch = vi.fn(async () =>
			makeSseResponse([...toolCallEvents(7), { type: 'done' }]),
		) as typeof fetch;

		const { container, emitted } = renderComponent();
		await waitFor(() => expect(emitted()).toHaveProperty('done'));

		const logBox = getLogBox(container);
		expect(logBox).not.toBeNull();
		expect(logBox?.querySelectorAll('.line')).toHaveLength(7);
		expect(logBox?.className).toContain('logBox');
		expect(logBox?.className).not.toContain('logBoxFaded');
	});

	it('applies the top fade once older lines are dropped from the log', async () => {
		// 9 lines > MAX_LINES — the two oldest get dropped
		globalThis.fetch = vi.fn(async () =>
			makeSseResponse([...toolCallEvents(9), { type: 'done' }]),
		) as typeof fetch;

		const { container, emitted } = renderComponent();
		await waitFor(() => expect(emitted()).toHaveProperty('done'));

		const logBox = getLogBox(container);
		expect(logBox).not.toBeNull();
		await waitFor(() => expect(logBox?.querySelectorAll('.line')).toHaveLength(7));
		// Oldest surviving line is tool_2 — tool_0 and tool_1 were dropped
		expect(logBox?.textContent).not.toContain('Tool 0');
		expect(logBox?.textContent).toContain('Tool 2');
		expect(logBox?.className).toContain('logBoxFaded');
	});

	it('keeps DOM nodes of surviving lines stable when the log window slides', async () => {
		// Guards the TransitionGroup keys: with unstable keys every trim
		// recreates all rows, so they leave + re-enter and briefly stack on top
		// of each other (position: absolute during leave).
		const sse = makeControlledSseResponse();
		globalThis.fetch = vi.fn(async () => sse.response) as typeof fetch;

		const { container } = renderComponent();
		for (const ev of toolCallEvents(7)) sse.push(ev);

		const logBox = getLogBox(container);
		await waitFor(() => expect(logBox?.querySelectorAll('.line')).toHaveLength(7));
		const survivor = [...(logBox?.querySelectorAll('.line') ?? [])].find((el) =>
			el.textContent?.includes('Tool 6'),
		);
		expect(survivor).toBeDefined();

		// Two more lines slide the window: tool_0 and tool_1 get dropped
		sse.push({ type: 'tool-call', toolCallId: 'tc-7', toolName: 'tool_7', input: {} });
		sse.push({ type: 'tool-call', toolCallId: 'tc-8', toolName: 'tool_8', input: {} });
		sse.push({ type: 'done' });
		sse.close();

		await waitFor(() => expect(logBox?.textContent).toContain('Tool 8'));
		await waitFor(() => expect(logBox?.textContent).not.toContain('Tool 0'));

		const survivorAfter = [...(logBox?.querySelectorAll('.line') ?? [])].find((el) =>
			el.textContent?.includes('Tool 6'),
		);
		expect(survivorAfter).toBe(survivor);
	});
});
