import { describe, expect, it } from 'vitest';

import {
	WEB_SEARCH_TOOL_NAME_KEY,
	formatToolNameForDisplay,
	getToolNameTranslationKey,
	resolveToolNameForDisplay,
} from '../utils/toolDisplayName';

describe('formatToolNameForDisplay', () => {
	it('formats snake_case builder tool names as readable labels', () => {
		expect(formatToolNameForDisplay('create_skill')).toBe('Create skill');
		expect(formatToolNameForDisplay('resolve_llm')).toBe('Resolve LLM');
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

	it('returns translation keys for stable builder tool IDs', () => {
		expect(getToolNameTranslationKey('resolve_integration')).toBe(
			'instanceAi.tools.resolve_integration',
		);
		expect(getToolNameTranslationKey('get_node_types')).toBe('instanceAi.tools.get_node_types');
		expect(getToolNameTranslationKey('list_credentials')).toBe('instanceAi.tools.list_credentials');
		expect(getToolNameTranslationKey('list_workflows')).toBe('instanceAi.tools.list_workflows');
	});

	it('returns an empty string for missing or blank names', () => {
		expect(formatToolNameForDisplay(undefined)).toBe('');
		expect(formatToolNameForDisplay('   ')).toBe('');
	});

	it('falls back to a humanized tool name when a translation key is missing', () => {
		expect(resolveToolNameForDisplay('search_nodes', (key) => key)).toBe('Search nodes');
	});
});
