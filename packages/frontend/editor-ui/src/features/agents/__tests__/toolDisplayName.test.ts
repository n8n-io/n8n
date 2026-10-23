import type { BaseTextKey } from '@n8n/i18n';
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
		expect(getToolNameTranslationKey('agent_builder_get_node_types')).toBe(
			'instanceAi.tools.agent_builder_get_node_types',
		);
		expect(getToolNameTranslationKey('agent_builder_list_credentials')).toBe(
			'instanceAi.tools.agent_builder_list_credentials',
		);
		expect(getToolNameTranslationKey('list_workflows')).toBe('instanceAi.tools.list_workflows');
		expect(getToolNameTranslationKey('list_skills')).toBe('instanceAi.tools.list_skills');
		expect(getToolNameTranslationKey('read_skill')).toBe('instanceAi.tools.read_skill');
		expect(getToolNameTranslationKey('agent_builder_update_skill')).toBe(
			'instanceAi.tools.agent_builder_update_skill',
		);
	});

	it('resolves legacy builder tool names to the current translation key', () => {
		expect(getToolNameTranslationKey('get_node_types')).toBe(
			'instanceAi.tools.agent_builder_get_node_types',
		);
		expect(getToolNameTranslationKey('write_config')).toBe(
			'instanceAi.tools.agent_builder_write_config',
		);
		expect(getToolNameTranslationKey(' ask_questions ')).toBe(
			'instanceAi.tools.agent_builder_ask_questions',
		);

		const translator = {
			baseText: (key: BaseTextKey) =>
				key === 'instanceAi.tools.agent_builder_write_config' ? 'Writing agent config' : key,
		};
		expect(resolveToolNameForDisplay('write_config', translator)).toBe('Writing agent config');
		expect(resolveToolNameForDisplay('agent_builder_write_config', translator)).toBe(
			'Writing agent config',
		);
	});

	it('drops the builder prefix from a fallback label', () => {
		const identity = { baseText: (key: BaseTextKey) => key };
		expect(resolveToolNameForDisplay('agent_builder_finish_setup', identity)).toBe('Finish setup');
		expect(resolveToolNameForDisplay('finish_setup', identity)).toBe('Finish setup');
	});

	it('returns an empty string for missing or blank names', () => {
		expect(formatToolNameForDisplay(undefined)).toBe('');
		expect(formatToolNameForDisplay('   ')).toBe('');
	});

	it('falls back to a humanized tool name when a translation key is missing', () => {
		expect(
			resolveToolNameForDisplay('agent_builder_search_nodes', { baseText: (key) => key }),
		).toBe('Search nodes');
	});

	it('preserves the translation context when resolving a tool name', () => {
		const translator = {
			translations: {
				[WEB_SEARCH_TOOL_NAME_KEY]: 'Web search',
			} as Partial<Record<BaseTextKey, string>>,
			baseText(key: BaseTextKey) {
				return this.translations[key] ?? key;
			},
		};

		expect(resolveToolNameForDisplay('web_search', translator)).toBe('Web search');
	});
});
