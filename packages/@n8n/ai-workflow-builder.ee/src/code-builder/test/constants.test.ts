/**
 * Tests for code-builder constants
 */

import {
	MAX_AGENT_ITERATIONS,
	MAX_VALIDATE_ATTEMPTS,
	FIX_VALIDATION_ERRORS_INSTRUCTION,
	TEXT_EDITOR_TOOL,
	VALIDATE_TOOL,
} from '../constants';

describe('code-builder constants', () => {
	describe('iteration limits', () => {
		it('should have MAX_AGENT_ITERATIONS set to 50', () => {
			expect(MAX_AGENT_ITERATIONS).toBe(50);
		});

		it('should have MAX_VALIDATE_ATTEMPTS set to 10', () => {
			expect(MAX_VALIDATE_ATTEMPTS).toBe(10);
		});
	});

	describe('FIX_VALIDATION_ERRORS_INSTRUCTION', () => {
		it('should include numbered steps for fixing errors', () => {
			expect(FIX_VALIDATION_ERRORS_INSTRUCTION).toContain('1.');
			expect(FIX_VALIDATION_ERRORS_INSTRUCTION).toContain('2.');
			expect(FIX_VALIDATION_ERRORS_INSTRUCTION).toContain('3.');
			expect(FIX_VALIDATION_ERRORS_INSTRUCTION).toContain('4.');
		});

		it('should remind agent to use get_node_types first', () => {
			expect(FIX_VALIDATION_ERRORS_INSTRUCTION).toContain('get_node_types');
		});

		it('should mention str_replace and insert as fix options', () => {
			expect(FIX_VALIDATION_ERRORS_INSTRUCTION).toContain('str_replace');
			expect(FIX_VALIDATION_ERRORS_INSTRUCTION).toContain('insert');
		});

		it('should instruct to validate after fixing', () => {
			expect(FIX_VALIDATION_ERRORS_INSTRUCTION).toContain('validate_workflow');
		});
	});

	describe('TEXT_EDITOR_TOOL', () => {
		it('should have correct type and name', () => {
			expect(TEXT_EDITOR_TOOL).toEqual({
				type: 'text_editor_20250728',
				name: 'str_replace_based_edit_tool',
			});
		});
	});

	describe('VALIDATE_TOOL', () => {
		it('should have correct function configuration', () => {
			expect(VALIDATE_TOOL.type).toBe('function');
			expect(VALIDATE_TOOL.function.name).toBe('validate_workflow');
			expect(VALIDATE_TOOL.function.description).toContain('Validate');
			expect(VALIDATE_TOOL.function.parameters.required).toContain('path');
		});
	});
});
