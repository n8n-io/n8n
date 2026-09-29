import { detectStickyLayoutWarnings } from './sticky-layout-warnings';
import type { WorkflowJSON } from '../types/base';
import { STICKY_NODE_TYPE } from './constants';

function wf(nodes: Array<Record<string, unknown>>): WorkflowJSON {
	return { name: 'T', nodes, connections: {} } as unknown as WorkflowJSON;
}

const note = (content: string, position: [number, number], width: number, height: number) => ({
	id: 's1',
	name: 'Note',
	type: STICKY_NODE_TYPE,
	typeVersion: 1,
	position,
	parameters: { content, width, height },
});

const plainNode = (position: [number, number]) => ({
	id: 'n1',
	name: 'Step',
	type: 'n8n-nodes-base.set',
	typeVersion: 3.4,
	position,
	parameters: {},
});

const LONG =
	'## Rejected signups\nNothing is written and no email is sent. The caller gets a 400 back with reason invalid_email and is expected to fix the address and retry.';

describe('detectStickyLayoutWarnings', () => {
	it('says nothing when the text fits', () => {
		expect(detectStickyLayoutWarnings(wf([note('## Hi', [0, 0], 400, 300)]))).toEqual([]);
	});

	it('says nothing about an empty note', () => {
		expect(detectStickyLayoutWarnings(wf([note('', [0, 0], 160, 160)]))).toEqual([]);
	});

	it('reports a free note whose text is taller than its box', () => {
		const warnings = detectStickyLayoutWarnings(wf([note(LONG, [0, 0], 160, 160)]));
		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('STICKY_TEXT_OVERFLOW');
		expect(warnings[0].nodeName).toBe('Note');
		expect(warnings[0].message).toContain('more text than fits');
	});

	it('measures a wrapping note against the band above its nodes, not the whole box', () => {
		// The box is tall because it wraps a node at the bottom; only the room above
		// that node is available for text.
		const tallEnoughOverall = wf([note(LONG, [0, 0], 160, 600), plainNode([32, 96])]);
		expect(detectStickyLayoutWarnings(tallEnoughOverall)).toHaveLength(1);
	});

	it('is quiet when the band above the nodes is generous', () => {
		const roomy = wf([note(LONG, [0, 0], 400, 700), plainNode([32, 500])]);
		expect(detectStickyLayoutWarnings(roomy)).toEqual([]);
	});

	it('stays quiet about a near miss', () => {
		// The estimator is tuned to over-estimate so that sizing never clips, so a
		// report has to ignore small shortfalls or it cries wolf.
		const nearMiss = '## Title\nOne line of body copy that very nearly fits.';
		expect(detectStickyLayoutWarnings(wf([note(nearMiss, [0, 0], 240, 96)]))).toEqual([]);
	});

	it('names every note that overflows', () => {
		const two = wf([
			{ ...note(LONG, [0, 0], 160, 120), id: 'a', name: 'First' },
			{ ...note(LONG, [400, 0], 160, 120), id: 'b', name: 'Second' },
		]);
		expect(detectStickyLayoutWarnings(two).map((w) => w.nodeName)).toEqual(['First', 'Second']);
	});
});
