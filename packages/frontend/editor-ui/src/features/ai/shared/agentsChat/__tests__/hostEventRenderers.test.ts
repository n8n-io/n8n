import { describe, expect, it } from 'vitest';

import { buildDisplayGroups } from '../displayGroups';
import {
	findHostEventRenderer,
	getHostEventItems,
	isHiddenHostEventOnlyMessage,
	type AgentsChatHostEventSource,
	type AgentsChatInteractionExtension,
} from '../interactionRegistry';
import type { AgentsChatHostEvent, ChatMessage } from '../types';
import {
	TEST_HOST_EVENT,
	TestHostEvent,
	TestToolResult,
	testHostEventExtensions,
	testInteractionExtension,
	testToolResultExtension,
} from './fixtures/testInteractionExtension';

function hostEvent(name: string, id = name): AgentsChatHostEvent {
	return { id, name, payload: { id } };
}

const message: ChatMessage = { id: 'assistant-1', role: 'assistant', content: '' };

function sources(...events: AgentsChatHostEvent[]): AgentsChatHostEventSource[] {
	return events.map((event) => ({ event, message }));
}

function ids(items: Array<{ event: AgentsChatHostEvent }>): string[] {
	return items.map((item) => item.event.id);
}

describe('findHostEventRenderer', () => {
	it('returns the extension that matches the event name', () => {
		expect(findHostEventRenderer(hostEvent(TEST_HOST_EVENT.END), testHostEventExtensions)).toEqual({
			key: 'test_host_end',
			placement: 'end',
			component: TestHostEvent,
		});
	});

	it('uses placement start when the extension sets no placement', () => {
		expect(
			findHostEventRenderer(hostEvent(TEST_HOST_EVENT.START), testHostEventExtensions),
		).toEqual({ key: 'test_host_start', placement: 'start', component: TestHostEvent });
	});

	it('returns placement none without a component', () => {
		expect(findHostEventRenderer(hostEvent(TEST_HOST_EVENT.NONE), testHostEventExtensions)).toEqual(
			{ key: 'test_host_none', placement: 'none' },
		);
	});

	it('returns undefined for an unknown event name', () => {
		expect(
			findHostEventRenderer(hostEvent('other.event'), testHostEventExtensions),
		).toBeUndefined();
	});

	it('returns undefined without extensions', () => {
		expect(findHostEventRenderer(hostEvent(TEST_HOST_EVENT.START), [])).toBeUndefined();
	});

	it('ignores extensions that only provide cards or tool results', () => {
		expect(
			findHostEventRenderer(hostEvent(TEST_HOST_EVENT.START), [
				testInteractionExtension,
				testToolResultExtension,
			]),
		).toBeUndefined();
	});

	it('ignores a match with a visible placement but no component', () => {
		const noComponent: AgentsChatInteractionExtension = {
			key: 'no_component',
			matchHostEvent: () => true,
			hostEventPlacement: 'end',
		};

		expect(
			findHostEventRenderer(hostEvent(TEST_HOST_EVENT.START), [
				noComponent,
				...testHostEventExtensions,
			])?.key,
		).toBe('test_host_start');
	});

	it('uses the first extension that matches', () => {
		const second: AgentsChatInteractionExtension = {
			key: 'second',
			matchHostEvent: (event) => event.name === TEST_HOST_EVENT.START,
			hostEventComponent: TestToolResult,
			hostEventPlacement: 'end',
		};

		expect(
			findHostEventRenderer(hostEvent(TEST_HOST_EVENT.START), [...testHostEventExtensions, second]),
		).toEqual({ key: 'test_host_start', placement: 'start', component: TestHostEvent });
	});
});

describe('getHostEventItems', () => {
	const events = sources(
		hostEvent(TEST_HOST_EVENT.END, 'end-1'),
		hostEvent(TEST_HOST_EVENT.START, 'start-1'),
		hostEvent(TEST_HOST_EVENT.TRANSIENT, 'transient-1'),
		hostEvent(TEST_HOST_EVENT.NONE, 'none-1'),
		hostEvent('other.event', 'other-1'),
		hostEvent(TEST_HOST_EVENT.START, 'start-2'),
		hostEvent(TEST_HOST_EVENT.END, 'end-2'),
	);

	it('sorts events by placement in arrival order and drops none and unknown events', () => {
		const items = getHostEventItems(events, testHostEventExtensions, { hasText: false });

		expect(ids(items.start)).toEqual(['start-1', 'start-2']);
		expect(ids(items.end)).toEqual(['end-1', 'end-2']);
		expect(ids(items.transient)).toEqual(['transient-1']);
		expect(items.start[0]).toMatchObject({ message, component: TestHostEvent });
	});

	it('drops transient events when the message has text', () => {
		const items = getHostEventItems(events, testHostEventExtensions, { hasText: true });

		expect(ids(items.transient)).toEqual([]);
		expect(ids(items.start)).toEqual(['start-1', 'start-2']);
	});

	it('returns no items without extensions', () => {
		expect(getHostEventItems(events, [], { hasText: false })).toEqual({
			start: [],
			end: [],
			transient: [],
		});
	});
});

describe('isHiddenHostEventOnlyMessage', () => {
	function hostOnly(...events: AgentsChatHostEvent[]): ChatMessage {
		return { ...message, status: 'success', hostEvents: events };
	}

	it('hides a message whose host events no extension renders', () => {
		const hidden = hostOnly(hostEvent(TEST_HOST_EVENT.NONE), hostEvent('other.event'));

		expect(isHiddenHostEventOnlyMessage(hidden, testHostEventExtensions)).toBe(true);
		expect(isHiddenHostEventOnlyMessage(hidden, [])).toBe(true);
	});

	it('keeps a message with a host event that an extension renders', () => {
		expect(
			isHiddenHostEventOnlyMessage(
				hostOnly(hostEvent(TEST_HOST_EVENT.NONE), hostEvent(TEST_HOST_EVENT.END)),
				testHostEventExtensions,
			),
		).toBe(false);
	});

	it('keeps a message with other content', () => {
		expect(
			isHiddenHostEventOnlyMessage(
				{ ...hostOnly(hostEvent(TEST_HOST_EVENT.NONE)), content: 'Hello' },
				testHostEventExtensions,
			),
		).toBe(false);
	});

	it('keeps a streaming message', () => {
		expect(
			isHiddenHostEventOnlyMessage(
				{ ...hostOnly(hostEvent(TEST_HOST_EVENT.NONE)), status: 'streaming' },
				testHostEventExtensions,
			),
		).toBe(false);
	});

	it('keeps a message without host events', () => {
		expect(isHiddenHostEventOnlyMessage({ ...message, status: 'success' }, [])).toBe(false);
	});
});

describe('buildDisplayGroups host events', () => {
	it('collects the host events of folded messages with their source message', () => {
		const first: ChatMessage = {
			id: 'a1',
			role: 'assistant',
			content: '',
			toolCalls: [{ tool: 'search', toolCallId: 'tc-1', state: 'done' }],
			hostEvents: [hostEvent(TEST_HOST_EVENT.START, 'e1')],
		};
		const final: ChatMessage = {
			id: 'a2',
			role: 'assistant',
			content: 'Done',
			hostEvents: [hostEvent(TEST_HOST_EVENT.END, 'e2')],
		};

		const [group] = buildDisplayGroups([first, final]);

		expect(group.kind).toBe('toolRun');
		if (group.kind !== 'toolRun') return;
		expect(group.hostEvents?.map(({ event, message: source }) => [event.id, source.id])).toEqual([
			['e1', 'a1'],
			['e2', 'a2'],
		]);
	});

	it('sets no host events on a tool run without them', () => {
		const [group] = buildDisplayGroups([
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: 'search', toolCallId: 'tc-1', state: 'done' }],
			},
		]);

		expect(group).not.toHaveProperty('hostEvents');
	});
});
