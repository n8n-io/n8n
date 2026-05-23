import { describe, expect, it } from 'vitest';

import {
	WEB_SEARCH_TOOL_NAME_KEY,
	formatToolNameForDisplay,
	getToolNameTranslationKey,
} from '../utils/toolDisplayName';

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

	it('returns an i18n key for native and fallback web search tool names', () => {
		expect(getToolNameTranslationKey('web_search')).toBe(WEB_SEARCH_TOOL_NAME_KEY);
		expect(getToolNameTranslationKey('anthropic.web_search')).toBe(WEB_SEARCH_TOOL_NAME_KEY);
		expect(getToolNameTranslationKey('anthropic.web_search_20250305')).toBe(
			WEB_SEARCH_TOOL_NAME_KEY,
		);
		expect(getToolNameTranslationKey('anthropic.web_search_20260209')).toBe(
			WEB_SEARCH_TOOL_NAME_KEY,
		);
		expect(getToolNameTranslationKey('openai.web_search')).toBe(WEB_SEARCH_TOOL_NAME_KEY);
		expect(getToolNameTranslationKey('openai.web_search_20270101')).toBe(WEB_SEARCH_TOOL_NAME_KEY);
		expect(getToolNameTranslationKey('custom_web_search')).toBeUndefined();
	});

	it('returns an empty string for missing or blank names', () => {
		expect(formatToolNameForDisplay(undefined)).toBe('');
		expect(formatToolNameForDisplay('   ')).toBe('');
	});
});
