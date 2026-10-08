import fc from 'fast-check';

import {
	getMessageSegmentKind,
	getPersistedPartSegmentKind,
	getSegmentMessageId,
	getTextSegmentKind,
	splitIntoSegments,
	startsNewSegment,
	type MessageSegmentKind,
} from '../messageSegments';

describe('getTextSegmentKind', () => {
	it('gives text for visible text', () => {
		expect(getTextSegmentKind('Hello')).toBe('text');
		expect(getTextSegmentKind('  Hello\n')).toBe('text');
	});

	it('gives no kind for blank or missing text', () => {
		expect(getTextSegmentKind('')).toBeUndefined();
		expect(getTextSegmentKind(' \n\t')).toBeUndefined();
		expect(getTextSegmentKind(undefined)).toBeUndefined();
	});
});

describe('getPersistedPartSegmentKind', () => {
	it('gives text for a text part with visible text', () => {
		expect(getPersistedPartSegmentKind({ type: 'text', text: 'Reading now.' })).toBe('text');
	});

	it('gives no kind for a blank or empty text part', () => {
		expect(getPersistedPartSegmentKind({ type: 'text', text: '\n\n' })).toBeUndefined();
		expect(getPersistedPartSegmentKind({ type: 'text' })).toBeUndefined();
	});

	it('gives tools for a named tool call', () => {
		expect(getPersistedPartSegmentKind({ type: 'tool-call', toolName: 'read_file' })).toBe('tools');
	});

	it('gives no kind for a tool call without a name, which the chat does not render', () => {
		expect(
			getPersistedPartSegmentKind({ type: 'tool-call', toolCallId: 'call-1' }),
		).toBeUndefined();
	});

	it('gives no kind for reasoning, files and unknown parts', () => {
		expect(getPersistedPartSegmentKind({ type: 'reasoning', text: 'Thinking' })).toBeUndefined();
		expect(getPersistedPartSegmentKind({ type: 'file', fileId: 'file-1' })).toBeUndefined();
		expect(getPersistedPartSegmentKind({ type: 'source', text: 'Not shown' })).toBeUndefined();
	});
});

describe('getMessageSegmentKind', () => {
	it('gives tools when the message holds tool calls', () => {
		const toolCalls = [{ tool: 'read_file', toolCallId: 'call-1', state: 'done' as const }];
		expect(getMessageSegmentKind({ content: '', toolCalls })).toBe('tools');
		expect(getMessageSegmentKind({ content: '\n', toolCalls })).toBe('tools');
	});

	it('gives text when the message holds visible text and no tool calls', () => {
		expect(getMessageSegmentKind({ content: 'Done.', toolCalls: [] })).toBe('text');
		expect(getMessageSegmentKind({ content: 'Done.' })).toBe('text');
	});

	it('gives no kind while the message holds neither', () => {
		expect(getMessageSegmentKind({ content: '', toolCalls: [] })).toBeUndefined();
		expect(getMessageSegmentKind({ content: '  ' })).toBeUndefined();
	});
});

describe('startsNewSegment', () => {
	it('starts a new segment when the output switches between text and tool calls', () => {
		expect(startsNewSegment('text', 'tools')).toBe(true);
		expect(startsNewSegment('tools', 'text')).toBe(true);
	});

	it('keeps output of the same kind in the open segment', () => {
		expect(startsNewSegment('text', 'text')).toBe(false);
		expect(startsNewSegment('tools', 'tools')).toBe(false);
	});

	it('keeps output in a segment that holds no kind yet', () => {
		expect(startsNewSegment(undefined, 'text')).toBe(false);
		expect(startsNewSegment(undefined, 'tools')).toBe(false);
		expect(startsNewSegment(undefined, undefined)).toBe(false);
	});

	it('keeps output without a kind in the open segment', () => {
		expect(startsNewSegment('text', undefined)).toBe(false);
		expect(startsNewSegment('tools', undefined)).toBe(false);
	});
});

describe('getSegmentMessageId', () => {
	it('keeps the persisted id for the first segment', () => {
		expect(getSegmentMessageId('exec-1:assistant', 0)).toBe('exec-1:assistant');
	});

	it('gives each later segment its own id that is stable across reloads', () => {
		expect(getSegmentMessageId('exec-1:assistant', 1)).toBe('exec-1:assistant:segment-1');
		expect(getSegmentMessageId('exec-1:assistant', 3)).toBe('exec-1:assistant:segment-3');
	});
});

type Kind = MessageSegmentKind | undefined;
const kindOf = (part: { kind: Kind }) => part.kind;
const parts = (...kinds: Kind[]) => kinds.map((kind, index) => ({ kind, index }));
const indexes = (segments: Array<Array<{ index: number }>>) =>
	segments.map((segment) => segment.map((part) => part.index));

describe('splitIntoSegments', () => {
	it('gives one empty segment for no parts, so an empty message still renders', () => {
		expect(splitIntoSegments([], kindOf)).toEqual([[]]);
	});

	it('splits text → 3 tools → text → 2 tools into four runs in order', () => {
		const input = parts('text', 'tools', 'tools', 'tools', 'text', 'tools', 'tools');
		expect(indexes(splitIntoSegments(input, kindOf))).toEqual([[0], [1, 2, 3], [4], [5, 6]]);
	});

	it('keeps consecutive parts of one kind together', () => {
		expect(indexes(splitIntoSegments(parts('text', 'text'), kindOf))).toEqual([[0, 1]]);
		expect(indexes(splitIntoSegments(parts('tools', 'tools'), kindOf))).toEqual([[0, 1]]);
	});

	it('adds parts without a kind to the open run', () => {
		const input = parts(undefined, 'text', undefined, 'tools', undefined, 'tools', 'text');
		expect(indexes(splitIntoSegments(input, kindOf))).toEqual([[0, 1, 2], [3, 4, 5], [6]]);
	});

	it('keeps parts without a kind in one segment when no part has a kind', () => {
		expect(indexes(splitIntoSegments(parts(undefined, undefined), kindOf))).toEqual([[0, 1]]);
	});
});

const kindArb = fc.constantFrom<Kind>('text', 'tools', undefined);
const partsArb = fc
	.array(kindArb, { maxLength: 30 })
	.map((kinds) => kinds.map((kind, index) => ({ kind, index })));

function definedKinds(segment: Array<{ kind: Kind }>): MessageSegmentKind[] {
	return [...new Set(segment.flatMap((part) => (part.kind ? [part.kind] : [])))];
}

describe('splitIntoSegments properties', () => {
	it('keeps every part once and in order', () => {
		fc.assert(
			fc.property(partsArb, (input) => {
				expect(splitIntoSegments(input, kindOf).flat()).toEqual(input);
			}),
		);
	});

	it('gives runs of one kind, and adjacent runs differ in kind', () => {
		fc.assert(
			fc.property(partsArb, (input) => {
				const kinds = splitIntoSegments(input, kindOf).map(definedKinds);
				for (const segmentKinds of kinds) expect(segmentKinds.length).toBeLessThanOrEqual(1);
				for (let i = 1; i < kinds.length; i++) {
					expect(kinds[i]).toHaveLength(1);
					expect(kinds[i][0]).not.toBe(kinds[i - 1][0]);
				}
			}),
		);
	});

	it('starts a segment only where the kind switches', () => {
		fc.assert(
			fc.property(partsArb, (input) => {
				const kinds = input.flatMap((part) => (part.kind ? [part.kind] : []));
				const switches = kinds.filter((kind, i) => i > 0 && kind !== kinds[i - 1]).length;
				const segments = splitIntoSegments(input, kindOf);
				expect(segments).toHaveLength(switches + 1);
				for (const segment of segments.slice(1)) expect(segment[0].kind).toBeDefined();
			}),
		);
	});
});
