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

	it('formats web search tool names as product labels', () => {
		expect(formatToolNameForDisplay('web_search')).toBe('Web search');
		expect(formatToolNameForDisplay('openai.web_search')).toBe('Web search');
		expect(formatToolNameForDisplay('xai.web_search')).toBe('Web search');
		expect(formatToolNameForDisplay('anthropic.web_search_20250305')).toBe('Web search');
		expect(formatToolNameForDisplay('web_open')).toBe('Fetch page');
	});

	it('returns an empty string for missing or blank names', () => {
		expect(formatToolNameForDisplay(undefined)).toBe('');
		expect(formatToolNameForDisplay('   ')).toBe('');
	});
});
