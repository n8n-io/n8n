import { describe, it, expect } from '@jest/globals';

import {
	GRID_SIZE,
	DEFAULT_NODE_SIZE,
	CONFIGURATION_NODE_SIZE,
	CONFIGURABLE_NODE_SIZE,
	NODE_X_SPACING,
	NODE_Y_SPACING,
	SUBGRAPH_SPACING,
	AI_X_SPACING,
	AI_Y_SPACING,
	DEFAULT_Y,
	START_X,
} from './constants';

describe('workflow-builder/constants', () => {
	describe('layout constants match FE', () => {
		it('GRID_SIZE is 16', () => {
			expect(GRID_SIZE).toBe(16);
		});

		it('DEFAULT_NODE_SIZE is 96x96', () => {
			expect(DEFAULT_NODE_SIZE).toEqual([96, 96]);
		});

		it('CONFIGURATION_NODE_SIZE is 80x80', () => {
			expect(CONFIGURATION_NODE_SIZE).toEqual([80, 80]);
		});

		it('CONFIGURABLE_NODE_SIZE is 256x96', () => {
			expect(CONFIGURABLE_NODE_SIZE).toEqual([256, 96]);
		});

		it('NODE_X_SPACING is GRID_SIZE * 8', () => {
			expect(NODE_X_SPACING).toBe(128);
		});

		it('NODE_Y_SPACING is GRID_SIZE * 6', () => {
			expect(NODE_Y_SPACING).toBe(96);
		});

		it('SUBGRAPH_SPACING is GRID_SIZE * 8', () => {
			expect(SUBGRAPH_SPACING).toBe(128);
		});

		it('AI_X_SPACING is GRID_SIZE * 3', () => {
			expect(AI_X_SPACING).toBe(48);
		});

		it('AI_Y_SPACING is GRID_SIZE * 8', () => {
			expect(AI_Y_SPACING).toBe(128);
		});
	});

	describe('legacy constants', () => {
		it('DEFAULT_Y is 300', () => {
			expect(DEFAULT_Y).toBe(300);
		});

		it('START_X is 100', () => {
			expect(START_X).toBe(100);
		});
	});
});
