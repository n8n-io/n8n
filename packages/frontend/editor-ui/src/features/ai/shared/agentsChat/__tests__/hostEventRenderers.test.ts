import { describe, expect, it } from 'vitest';

import { buildDisplayGroups } from '../displayGroups';
import {
	findHostEventRenderer,
	getHostEventItems,
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
	it('returns the component and placement of the matching extension', () => {
		expect(findHostEventRenderer(hostEvent(TEST_HOST_EVENT.END), testHostEventExtensions)).toEqual({
			placement: 'end',
			component: TestHostEvent,
		});
	});

	it('uses placement start when the extension sets no placement', () => {
		expect(
			findHostEventRenderer(hostEvent(TEST_HOST_EVENT.START), testHostEventExtensions),
		).toEqual({ placement: 'start', component: TestHostEvent });
	});

	it('returns undefined for an unknown event name or without extensions', () => {
		expect(
			findHostEventRenderer(hostEvent('other.event'), testHostEventExtensions),
		).toBeUndefined();
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

	it('ignores a match without a component', () => {
		const noComponent: AgentsChatInteractionExtension = {
			key: 'no_component',
			matchHostEvent: () => true,
			hostEventPlacement: 'end',
		};

		expect(
			findHostEventRenderer(hostEvent(TEST_HOST_EVENT.START), [
				noComponent,
				...testHostEventExtensions,
			]),
		).toEqual({ placement: 'start', component: TestHostEvent });
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
		).toEqual({ placement: 'start', component: TestHostEvent });
	});
});

describe('getHostEventItems', () => {
	const events = sources(
		hostEvent(TEST_HOST_EVENT.END, 'end-1'),
		hostEvent(TEST_HOST_EVENT.TRANSIENT, 'transient-1'),
		hostEvent(TEST_HOST_EVENT.START, 'start-1'),
		hostEvent('other.event', 'other-1'),
		hostEvent(TEST_HOST_EVENT.START, 'start-2'),
		hostEvent(TEST_HOST_EVENT.END, 'end-2'),
	);

	it('sorts events by placement in arrival order, with transient events last, and drops unknown events', () => {
		const items = getHostEventItems(events, testHostEventExtensions, true);

		expect(ids(items.start)).toEqual(['start-1', 'start-2']);
		expect(ids(items.end)).toEqual(['end-1', 'end-2', 'transient-1']);
		expect(items.start[0]).toMatchObject({ message, component: TestHostEvent, placement: 'start' });
	});

	it('drops transient events when showTransient is false', () => {
		const items = getHostEventItems(events, testHostEventExtensions, false);

		expect(ids(items.start)).toEqual(['start-1', 'start-2']);
		expect(ids(items.end)).toEqual(['end-1', 'end-2']);
	});

	it('returns no items without extensions', () => {
		expect(getHostEventItems(events, [], true)).toEqual({ start: [], end: [] });
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

	it('keeps one copy of a host event that folded messages repeat', () => {
		const suspended: ChatMessage = {
			id: 'a1',
			role: 'assistant',
			content: '',
			toolCalls: [{ tool: 'search', toolCallId: 'tc-1', state: 'done' }],
			hostEvents: [hostEvent(TEST_HOST_EVENT.START, 'e1'), hostEvent(TEST_HOST_EVENT.END, 'e2')],
		};
		const completed: ChatMessage = {
			id: 'a2',
			role: 'assistant',
			content: 'Done',
			hostEvents: [hostEvent(TEST_HOST_EVENT.START, 'e1'), hostEvent(TEST_HOST_EVENT.END, 'e3')],
		};

		const [group] = buildDisplayGroups([suspended, completed]);

		expect(group.kind).toBe('toolRun');
		if (group.kind !== 'toolRun') return;
		expect(group.hostEvents?.map(({ event, message: source }) => [event.id, source.id])).toEqual([
			['e1', 'a2'],
			['e2', 'a1'],
			['e3', 'a2'],
		]);
	});

	it('replaces a keyed host event that a later folded message re-emits', () => {
		const first: ChatMessage = {
			id: 'a1',
			role: 'assistant',
			content: '',
			toolCalls: [{ tool: 'search', toolCallId: 'tc-1', state: 'done' }],
			hostEvents: [
				{ ...hostEvent(TEST_HOST_EVENT.START, 'e1'), key: 'context' },
				hostEvent(TEST_HOST_EVENT.END, 'e2'),
			],
		};
		const final: ChatMessage = {
			id: 'a2',
			role: 'assistant',
			content: 'Done',
			hostEvents: [{ ...hostEvent(TEST_HOST_EVENT.START, 'e3'), key: 'context' }],
		};

		const [group] = buildDisplayGroups([first, final]);

		expect(group.kind).toBe('toolRun');
		if (group.kind !== 'toolRun') return;
		expect(group.hostEvents?.map(({ event, message: source }) => [event.id, source.id])).toEqual([
			['e3', 'a2'],
			['e2', 'a1'],
		]);
	});

	it('keeps keyed host events with the same key and another name', () => {
		const first: ChatMessage = {
			id: 'a1',
			role: 'assistant',
			content: '',
			toolCalls: [{ tool: 'search', toolCallId: 'tc-1', state: 'done' }],
			hostEvents: [{ ...hostEvent(TEST_HOST_EVENT.START, 'e1'), key: 'build' }],
		};
		const final: ChatMessage = {
			id: 'a2',
			role: 'assistant',
			content: 'Done',
			hostEvents: [{ ...hostEvent(TEST_HOST_EVENT.END, 'e2'), key: 'build' }],
		};

		const [group] = buildDisplayGroups([first, final]);

		expect(group.kind).toBe('toolRun');
		if (group.kind !== 'toolRun') return;
		expect(group.hostEvents?.map(({ event }) => event.id)).toEqual(['e1', 'e2']);
	});

	it('keeps a background job signal message that carries only host events', () => {
		const groups = buildDisplayGroups([
			{
				id: 'wake:assistant',
				executionId: 'wake',
				role: 'assistant',
				content: '',
				backgroundJobSignal: {
					tasks: [{ id: 'job-1', title: 'Research', kind: 'subagent', status: 'completed' }],
				},
				hostEvents: [hostEvent(TEST_HOST_EVENT.END, 'e1')],
			},
		]);

		expect(groups.map(({ kind }) => kind)).toEqual(['backgroundJobSignal', 'message']);
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
