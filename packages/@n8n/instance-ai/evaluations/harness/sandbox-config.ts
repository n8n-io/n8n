// ---------------------------------------------------------------------------
// Sandbox config resolution for evaluations.
//
// Reads the same env vars production reads (N8N_INSTANCE_AI_SANDBOX_*,
// DAYTONA_*, N8N_SANDBOX_SERVICE_*) and produces a SandboxConfig the
// in-process eval harness can hand to BuilderSandboxFactory.
//
// The sandbox is always on for evals — there is no opt-out. Missing
// required env vars raise clear errors so misconfiguration shows up at
// startup, not mid-run.
// ---------------------------------------------------------------------------

import type { SandboxConfig, SandboxProvider } from '../../src/workspace/create-workspace';

const DEFAULT_TIMEOUT_MS = 300_000;
/**
 * Default cold-build window for Daytona's first sandbox provisioning. The
 * image runs `npm install @n8n/workflow-sdk` which routinely takes longer
 * than the SDK's 300s default; 900s avoids spurious eval-run failures.
 */
const DEFAULT_DAYTONA_CREATE_TIMEOUT_SECONDS = 900;
const VALID_PROVIDERS: SandboxProvider[] = ['daytona', 'local', 'n8n-sandbox'];

export function resolveSandboxConfig(env: NodeJS.ProcessEnv): SandboxConfig {
	const providerRaw = env.N8N_INSTANCE_AI_SANDBOX_PROVIDER ?? 'daytona';
	if (!VALID_PROVIDERS.includes(providerRaw as SandboxProvider)) {
		throw new Error(
			`Invalid sandbox provider "${providerRaw}". Set N8N_INSTANCE_AI_SANDBOX_PROVIDER to one of: ${VALID_PROVIDERS.join(', ')}.`,
		);
	}
	const provider = providerRaw as SandboxProvider;
	const timeout = parseTimeout(env.N8N_INSTANCE_AI_SANDBOX_TIMEOUT) ?? DEFAULT_TIMEOUT_MS;

	if (provider === 'daytona') {
		const daytonaApiUrl = env.DAYTONA_API_URL;
		const daytonaApiKey = env.DAYTONA_API_KEY;
		if (!daytonaApiUrl) {
			throw new Error(
				'DAYTONA_API_URL is required for sandbox provider "daytona". Set it to e.g. https://app.daytona.io/api.',
			);
		}
		if (!daytonaApiKey) {
			throw new Error(
				'DAYTONA_API_KEY is required for sandbox provider "daytona". Set the Daytona API key.',
			);
		}
		const image = env.N8N_INSTANCE_AI_SANDBOX_IMAGE;
		const createTimeoutSeconds =
			parsePositiveInt(
				env.N8N_INSTANCE_AI_SANDBOX_CREATE_TIMEOUT_SECONDS,
				'N8N_INSTANCE_AI_SANDBOX_CREATE_TIMEOUT_SECONDS',
			) ?? DEFAULT_DAYTONA_CREATE_TIMEOUT_SECONDS;
		return {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl,
			daytonaApiKey,
			timeout,
			createTimeoutSeconds,
			...(image ? { image } : {}),
		};
	}

	if (provider === 'n8n-sandbox') {
		const serviceUrl = env.N8N_SANDBOX_SERVICE_URL;
		if (!serviceUrl) {
			throw new Error(
				'N8N_SANDBOX_SERVICE_URL is required for sandbox provider "n8n-sandbox". Set it to the service URL, or pick a different provider via N8N_INSTANCE_AI_SANDBOX_PROVIDER.',
			);
		}
		const apiKey = env.N8N_SANDBOX_SERVICE_API_KEY;
		return {
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl,
			...(apiKey ? { apiKey } : {}),
			timeout,
		};
	}

	return { enabled: true, provider: 'local', timeout };
}

function parseTimeout(raw: string | undefined): number | undefined {
	if (raw === undefined || raw === '') return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) {
		throw new Error(
			`N8N_INSTANCE_AI_SANDBOX_TIMEOUT must be a positive number of ms, got "${raw}".`,
		);
	}
	return n;
}

function parsePositiveInt(raw: string | undefined, varName: string): number | undefined {
	if (raw === undefined || raw === '') return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
		throw new Error(`${varName} must be a positive integer, got "${raw}".`);
	}
	return n;
}
