import { describe, expect, it } from 'vitest';

import { formatToolNameForDisplay } from '../utils/toolDisplayName';

describe('formatToolNameForDisplay', () => {
	it('formats snake_case builder tool names as readable labels', () => {
		expect(formatToolNameForDisplay('create_skill')).toBe('Create skill');
		expect(formatToolNameForDisplay('ask_llm')).toBe('Ask LLM');
		expect(formatToolNameForDisplay('build_custom_tool')).toBe('Build custom tool');
		expect(formatToolNameForDisplay('update_memory')).toBe('Update memory');
	});

	it('also handles hyphenated names and extra whitespace', () => {
		expect(formatToolNameForDisplay('  search-nodes  ')).toBe('Search nodes');
		expect(formatToolNameForDisplay('ask__credential')).toBe('Ask credential');
	});

	it('returns an empty string for missing or blank names', () => {
		expect(formatToolNameForDisplay(undefined)).toBe('');
		expect(formatToolNameForDisplay('   ')).toBe('');
	});

	it('collapses known memory tool names to a single "Update memory" label', () => {
		expect(formatToolNameForDisplay('update_working_memory')).toBe('Update memory');
	});
});
