import { describe, it, expect, vi } from 'vitest';
import type { Connection } from '@vue-flow/core';

import { replaceCanvasConnection } from './canvasConnectionReplacement.utils';
import type { INodeUi } from '@/Interface';

vi.mock('@/features/workflows/canvas/canvas.utils', () => ({
	createCanvasConnectionHandleString: vi.fn(() => 'handle'),
	mapCanvasConnectionToLegacyConnection: vi.fn(() => [
		{ node: 'A', type: 'main', index: 0 },
		{ node: 'B', type: 'main', index: 0 },
	]),
	mapLegacyConnectionToCanvasConnection: vi.fn(() => ({
		source: 's',
		target: 't',
		sourceHandle: '',
		targetHandle: '',
	})),
	parseCanvasConnectionHandleString: vi.fn(() => ({ type: 'main', index: 0, mode: 'outputs' })),
}));

function makeNode(id: string): INodeUi {
	return {
		id,
		name: id,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as INodeUi;
}

function connection(source: string, target: string): Connection {
	return { source, target, sourceHandle: '', targetHandle: '' };
}

function buildInput(overrides: Record<string, unknown> = {}) {
	return {
		connectionToRemove: connection('a', 'b'),
		addBeforeRemoval: [connection('a', 'x')],
		addAfterRemoval: [connection('x', 'b')],
		workflowDocumentStore: {
			getNodeById: (id: string) => makeNode(id),
		},
		createConnection: vi.fn(),
		deleteConnection: vi.fn(),
		isConnectionAllowed: () => true,
		enforceNodeGroupConnectionPolicy: vi.fn(() => true),
		...overrides,
	} as unknown as Parameters<typeof replaceCanvasConnection>[0];
}

describe('replaceCanvasConnection', () => {
	it('routes the change through enforceNodeGroupConnectionPolicy and proceeds when allowed', () => {
		const policy = vi.fn(() => true);
		const input = buildInput({ enforceNodeGroupConnectionPolicy: policy });

		const result = replaceCanvasConnection(input);

		expect(result).toBe(true);
		expect(policy).toHaveBeenCalledWith(
			expect.objectContaining({
				connectionsToRemove: expect.any(Array),
				connectionsToAdd: expect.any(Array),
			}),
		);
		expect(input.createConnection).toHaveBeenCalled();
		expect(input.deleteConnection).toHaveBeenCalled();
	});

	it('aborts without touching connections when the policy rejects the change', () => {
		const input = buildInput({ enforceNodeGroupConnectionPolicy: vi.fn(() => false) });

		const result = replaceCanvasConnection(input);

		expect(result).toBe(false);
		expect(input.createConnection).not.toHaveBeenCalled();
		expect(input.deleteConnection).not.toHaveBeenCalled();
	});

	it('forwards trackHistory to the policy so an auto-extend is recorded on redo', () => {
		const policy = vi.fn(() => true);
		const input = buildInput({ enforceNodeGroupConnectionPolicy: policy, trackHistory: true });

		replaceCanvasConnection(input);

		expect(policy).toHaveBeenCalledWith(expect.objectContaining({ trackHistory: true }));
	});

	it('defaults trackHistory to false when not tracking', () => {
		const policy = vi.fn(() => true);
		const input = buildInput({ enforceNodeGroupConnectionPolicy: policy });

		replaceCanvasConnection(input);

		expect(policy).toHaveBeenCalledWith(expect.objectContaining({ trackHistory: false }));
	});
});
