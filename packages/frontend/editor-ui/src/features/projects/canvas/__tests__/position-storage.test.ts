import { describe, it, expect, beforeEach } from 'vitest';

import { loadCanvasState, positionsStorageKey, saveCanvasState } from '../position-storage';

const emptyState = { expanded: [], childOffsets: new Map() };

describe('canvas state storage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('round-trips positions per project', () => {
		saveCanvasState('p1', { ...emptyState, positions: new Map([['wf-1', { x: 10.4, y: 20.6 }]]) });
		saveCanvasState('p2', { ...emptyState, positions: new Map([['wf-1', { x: 99, y: 99 }]]) });

		expect(loadCanvasState('p1')?.positions.get('wf-1')).toEqual({ x: 10, y: 21 });
		expect(loadCanvasState('p2')?.positions.get('wf-1')).toEqual({ x: 99, y: 99 });
	});

	it('round-trips expansion state and child offsets', () => {
		saveCanvasState('p1', {
			positions: new Map([['folder-1', { x: 0, y: 0 }]]),
			expanded: ['folder-1'],
			childOffsets: new Map([['folder-1', { 'wf-1': { x: 30, y: 120 } }]]),
		});

		const loaded = loadCanvasState('p1');
		expect(loaded?.expanded).toEqual(['folder-1']);
		expect(loaded?.childOffsets.get('folder-1')).toEqual({ 'wf-1': { x: 30, y: 120 } });
	});

	it('prunes entries not in knownIds so deleted entities don’t accumulate', () => {
		saveCanvasState(
			'p1',
			{
				positions: new Map([
					['keep', { x: 1, y: 2 }],
					['deleted', { x: 3, y: 4 }],
				]),
				expanded: ['keep', 'deleted'],
				childOffsets: new Map([
					['keep', {}],
					['deleted', {}],
				]),
			},
			new Set(['keep']),
		);

		const loaded = loadCanvasState('p1');
		expect(loaded?.positions.has('keep')).toBe(true);
		expect(loaded?.positions.has('deleted')).toBe(false);
		expect(loaded?.expanded).toEqual(['keep']);
		expect(loaded?.childOffsets.has('deleted')).toBe(false);
	});

	it('still loads version 1 payloads (positions only)', () => {
		localStorage.setItem(
			positionsStorageKey('p1'),
			JSON.stringify({ version: 1, positions: { 'wf-1': { x: 5, y: 6 } } }),
		);
		const loaded = loadCanvasState('p1');
		expect(loaded?.positions.get('wf-1')).toEqual({ x: 5, y: 6 });
		expect(loaded?.expanded).toEqual([]);
		expect(loaded?.childOffsets.size).toBe(0);
	});

	it('returns null for missing or corrupt data', () => {
		expect(loadCanvasState('missing')).toBeNull();

		localStorage.setItem(positionsStorageKey('corrupt'), 'not-json{');
		expect(loadCanvasState('corrupt')).toBeNull();

		localStorage.setItem(positionsStorageKey('wrong-version'), JSON.stringify({ version: 99 }));
		expect(loadCanvasState('wrong-version')).toBeNull();
	});

	it('skips entries with non-numeric coordinates', () => {
		localStorage.setItem(
			positionsStorageKey('p1'),
			JSON.stringify({
				version: 2,
				positions: { good: { x: 1, y: 2 }, bad: { x: 'NaN-ish', y: null } },
				childOffsets: { f1: { good: { x: 1, y: 2 }, bad: { x: null, y: 'x' } } },
			}),
		);
		const loaded = loadCanvasState('p1');
		expect(loaded?.positions.has('good')).toBe(true);
		expect(loaded?.positions.has('bad')).toBe(false);
		expect(loaded?.childOffsets.get('f1')).toEqual({ good: { x: 1, y: 2 } });
	});
});
