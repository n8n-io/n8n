/**
 * Aliases for provider tool IDs. Users (and the builder prompt) write a
 * short, stable name like "anthropic.web_search" in their agent config;
 * providers expect the versioned form like "anthropic.web_search_20260209".
 *
 * Bump the versioned targets here when the underlying provider releases a
 * new generation of a tool. Agents saved against the short name automatically
 * pick up the new version on the next reconstruction — no migration needed.
 *
 * Keys are organised per-provider so the provider boundary stays clear when
 * more tools or vendors are added.
 */

// Anthropic (https://platform.claude.com/docs/en/agents-and-tools/tool-use)
//
// `web_search` intentionally targets the pre-dynamic-filtering version. The
// newer `web_search_20260209` activates a server-side code-execution pipeline
// that is slower per request, emits code_execution tool results on every
// search, and is only officially supported on 4.6+ models.
// Users who actually want dynamic filtering can opt in by writing the full
// versioned id in their config — unknown names pass through untouched.
const ANTHROPIC_TOOL_ALIASES: Record<string, string> = {
	'anthropic.web_search': 'anthropic.web_search_20250305',
};

// OpenAI (https://platform.openai.com/docs/guides/tools-web-search)
//
// OpenAI tool IDs are unversioned (e.g. `openai.web_search`,
// `openai.image_generation`), so no aliasing is needed today — the config
// names flow straight through `resolveProviderToolName` unchanged. This block
// is left as a marker so future OpenAI additions live alongside Anthropic.
const OPENAI_TOOL_ALIASES: Record<string, string> = {};

const PROVIDER_TOOL_ALIASES: Record<string, string> = {
	...ANTHROPIC_TOOL_ALIASES,
	...OPENAI_TOOL_ALIASES,
};

/**
 * Resolve a provider-tool name written in the JSON config to the versioned
 * identifier the provider expects. Unknown names pass through unchanged, so
 * callers writing a fully-versioned id directly (e.g. `anthropic.web_search_20260209`)
 * are not rewritten.
 */
export function resolveProviderToolName(name: string): string {
	return PROVIDER_TOOL_ALIASES[name] ?? name;
}
