import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const LOCAL_INSTANCE_PORT = 5680;
export const LOCAL_INSTANCE_URL = `http://127.0.0.1:${LOCAL_INSTANCE_PORT}`;
export const LOCAL_OWNER_EMAIL = 'owner@n8n.local';

/** Dedicated task-broker port, so the embedded instance never collides with a dev n8n on 5679. */
const TASK_BROKER_PORT = 5681;

export const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'gemma4';

/** Where the embedded instance's stdout/stderr goes — next to the app's own log. */
export const LOCAL_INSTANCE_LOG_FILE = path.join(
	os.homedir(),
	'.n8n-local-gateway',
	'local-n8n.log',
);

/** The n8n CLI entry point, resolved relative to the built main bundle (dist/main). */
export function resolveN8nBinPath(): string {
	return (
		process.env.N8N_LOCAL_GATEWAY_N8N_BIN ??
		path.resolve(__dirname, '../../../../..', 'packages/cli/bin/n8n')
	);
}

/** The ollama model tag the embedded instance uses when no Anthropic key is provided. */
export function resolveOllamaModel(): string {
	return process.env.N8N_LOCAL_GATEWAY_OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL;
}

/**
 * The Anthropic key is a dev/testing-only override, sourced from the process env or the
 * package's gitignored `.env` — deliberately no UI for it: without a key the embedded
 * instance runs against local ollama.
 */
export function loadAnthropicApiKey(): string | null {
	if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
	try {
		const envFile = readFileSync(path.resolve(__dirname, '../..', '.env'), 'utf-8');
		for (const line of envFile.split('\n')) {
			const match = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
			if (match) return match[1].trim();
		}
	} catch {
		// No .env file — expected outside local development.
	}
	return null;
}

/** Password for the generated owner: the fixed prefix satisfies the digit + uppercase rules. */
export function generateOwnerPassword(): string {
	return `A1${randomBytes(24).toString('base64url')}`;
}

export interface LocalInstanceEnvOptions {
	/** Electron `app.getPath('userData')` — the instance DB and encryption key live under it. */
	userDataDir: string;
	anthropicApiKey: string | null;
}

/** Env overrides for the n8n child process (spread over the parent env at spawn time). */
export function buildLocalInstanceEnv(options: LocalInstanceEnvOptions): Record<string, string> {
	const model: Record<string, string> = options.anthropicApiKey
		? {
				N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
				ANTHROPIC_API_KEY: options.anthropicApiKey,
			}
		: { N8N_INSTANCE_AI_MODEL: `ollama/${resolveOllamaModel()}` };

	return {
		ELECTRON_RUN_AS_NODE: '1',
		N8N_PORT: String(LOCAL_INSTANCE_PORT),
		N8N_RUNNERS_BROKER_PORT: String(TASK_BROKER_PORT),
		N8N_LISTEN_ADDRESS: '127.0.0.1',
		N8N_SECURE_COOKIE: 'false',
		N8N_USER_FOLDER: path.join(options.userDataDir, 'local-n8n'),
		N8N_DIAGNOSTICS_ENABLED: 'false',
		N8N_RUNNERS_ENABLED: 'true',
		EXECUTIONS_MODE: 'regular',
		N8N_AI_ENABLED: 'true',
		N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
		N8N_ENABLED_MODULES: 'instance-ai,mcp-registry,agents',
		N8N_MCP_MANAGED_BY_ENV: 'true',
		N8N_MCP_ACCESS_ENABLED: 'true',
		...model,
	};
}
