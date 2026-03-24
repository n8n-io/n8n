import { describe, it, expect } from '@jest/globals';

import { NODE_SPACING_X, DEFAULT_Y, START_X } from './constants';

describe('workflow-builder/constants', () => {
	describe('NODE_SPACING_X', () => {
		it('is 200 pixels', () => {
			expect(NODE_SPACING_X).toBe(200);
		});
	});

	describe('DEFAULT_Y', () => {
		it('is 300 pixels', () => {
			expect(DEFAULT_Y).toBe(300);
		});
	});

	describe('START_X', () => {
		it('is 100 pixels', () => {
			expect(START_X).toBe(100);
		});
	});
});
