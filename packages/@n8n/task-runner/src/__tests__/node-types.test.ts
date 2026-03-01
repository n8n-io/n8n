import type { INodeTypeDescription } from 'n8n-workflow';

import { TaskRunnerNodeTypes } from '../node-types';

const SINGLE_VERSIONED = { name: 'single-versioned', version: 1 };

const SINGLE_UNVERSIONED = { name: 'single-unversioned' };

const MULTI_VERSIONED = { name: 'multi-versioned', version: [1, 2] };

const SPLIT_VERSIONED = [
	{ name: 'split-versioned', version: 1 },
	{ name: 'split-versioned', version: 2 },
];

const TYPES: INodeTypeDescription[] = [
	SINGLE_VERSIONED,
	SINGLE_UNVERSIONED,
	MULTI_VERSIONED,
	...SPLIT_VERSIONED,
] as INodeTypeDescription[];

describe('TaskRunnerNodeTypes', () => {
	describe('getByNameAndVersion', () => {
		let nodeTypes: TaskRunnerNodeTypes;

		beforeEach(() => {
			nodeTypes = new TaskRunnerNodeTypes(TYPES);
		});

		it('should return undefined if not found', () => {
			expect(nodeTypes.getByNameAndVersion('unknown', 1)).toBeUndefined();
		});

		it('should return highest versioned node type if no version is given', () => {
			expect(nodeTypes.getByNameAndVersion('split-versioned')).toEqual({
				description: SPLIT_VERSIONED[1],
			});
		});

		it('should return specified version for split version', () => {
			expect(nodeTypes.getByNameAndVersion('split-versioned', 1)).toEqual({
				description: SPLIT_VERSIONED[0],
			});
		});

		it('should return undefined on unknown version', () => {
			expect(nodeTypes.getByNameAndVersion('split-versioned', 3)).toBeUndefined();
		});

		it('should return specified version for multi version', () => {
			expect(nodeTypes.getByNameAndVersion('multi-versioned', 1)).toEqual({
				description: MULTI_VERSIONED,
			});
			expect(nodeTypes.getByNameAndVersion('multi-versioned', 2)).toEqual({
				description: MULTI_VERSIONED,
			});
		});

		it('should default to DEFAULT_NODETYPE_VERSION if no version specified', () => {
			expect(nodeTypes.getByNameAndVersion('single-unversioned', 1)).toEqual({
				description: SINGLE_UNVERSIONED,
			});
		});
	});

	describe('addNodeTypeDescriptions', () => {
		it('should add new node types', () => {
			const nodeTypes = new TaskRunnerNodeTypes(TYPES);

			const nodeTypeDescriptions = [
				{ name: 'new-type', version: 1 },
				{ name: 'new-type', version: 2 },
			] as INodeTypeDescription[];

			nodeTypes.addNodeTypeDescriptions(nodeTypeDescriptions);

			expect(nodeTypes.getByNameAndVersion('new-type', 1)).toEqual({
				description: { name: 'new-type', version: 1 },
			});
			expect(nodeTypes.getByNameAndVersion('new-type', 2)).toEqual({
				description: { name: 'new-type', version: 2 },
			});
		});
	});

	describe('onlyUnknown', () => {
		it('should return only unknown node types', () => {
			const nodeTypes = new TaskRunnerNodeTypes(TYPES);

			const candidate = { name: 'unknown', version: 1 };

			expect(nodeTypes.onlyUnknown([candidate])).toEqual([candidate]);
			expect(nodeTypes.onlyUnknown([SINGLE_VERSIONED])).toEqual([]);
		});
	});
});
