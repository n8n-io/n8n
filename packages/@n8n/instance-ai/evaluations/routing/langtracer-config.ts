// ---------------------------------------------------------------------------
// LangTracer connection for the routing eval tools.
//
// Env first (LANGTRACER_URL + LANGTRACER_API_KEY, like the other eval CLIs).
// When they are not set, the lang-tracer MCP server entry in ~/.claude.json
// supplies them: its URL without the trailing `/mcp`, and the bearer token of
// its Authorization header. The key is never printed.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { resolveLangTracerConfig, type LangTracerConfig } from '../langtracer/config';

const MCP_SERVER_NAME = 'lang-tracer';

export function defaultClaudeConfigPath(): string {
	return join(homedir(), '.claude.json');
}

/** Reads the lang-tracer MCP entry of a Claude config file, or undefined when it has none. */
export function langTracerConfigFromClaudeConfig(raw: unknown): LangTracerConfig | undefined {
	if (!isRecord(raw) || !isRecord(raw.mcpServers)) return undefined;
	const server = raw.mcpServers[MCP_SERVER_NAME];
	if (!isRecord(server) || typeof server.url !== 'string' || !isRecord(server.headers)) {
		return undefined;
	}
	const authorization = server.headers.Authorization;
	if (typeof authorization !== 'string') return undefined;
	const apiKey = authorization.replace(/^Bearer\s+/i, '').trim();
	const baseUrl = server.url.trim().replace(/\/mcp\/?$/, '');
	if (!apiKey || !baseUrl) return undefined;
	return { baseUrl, apiKey };
}

export function resolveRoutingLangTracerConfig(
	env: NodeJS.ProcessEnv = process.env,
	claudeConfigPath: string = defaultClaudeConfigPath(),
): LangTracerConfig {
	if (env.LANGTRACER_URL?.trim() && env.LANGTRACER_API_KEY?.trim()) {
		return resolveLangTracerConfig(env);
	}
	if (existsSync(claudeConfigPath)) {
		const fromFile = langTracerConfigFromClaudeConfig(
			jsonParse<unknown>(readFileSync(claudeConfigPath, 'utf-8'), { fallbackValue: undefined }),
		);
		if (fromFile) return fromFile;
	}
	// Throws with the message that names the missing variables.
	return resolveLangTracerConfig(env);
}
