import type { TaskRunnerMode } from '@n8n/config';
import type { PythonImportPolicy } from '@n8n/workflow-sdk';

interface PythonImportPolicyInput {
	/** Raw `N8N_RUNNERS_STDLIB_ALLOW` value. */
	stdlibAllow: string;
	/** Raw `N8N_RUNNERS_EXTERNAL_ALLOW` value. */
	externalAllow: string;
	mode: TaskRunnerMode;
}

/** Mirrors `parse_allowlist` in the Python runner: comma-separated, trimmed, empties dropped. */
function parseAllowlist(raw: string): string[] {
	return raw
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

/**
 * The import policy the Python runner will enforce, as far as n8n can know it.
 *
 * In `internal` mode n8n spawns the runner with its own values, so the policy is
 * exact. In `external` mode the runner is a separate process configured on its own
 * — the official runners image even forces both allowlists empty — so n8n's view is
 * a guess and callers must not present it as fact.
 */
export function buildPythonImportPolicy({
	stdlibAllow,
	externalAllow,
	mode,
}: PythonImportPolicyInput): PythonImportPolicy {
	return {
		stdlib: parseAllowlist(stdlibAllow),
		external: parseAllowlist(externalAllow),
		authoritative: mode === 'internal',
	};
}
