import type { TaskRunnerMode } from '@n8n/config';
import type { PythonImportPolicy } from '@n8n/workflow-sdk';

interface PythonImportPolicyInput {
	/** Raw `N8N_RUNNERS_STDLIB_ALLOW` value. */
	stdlibAllow: string;
	/** Raw `N8N_RUNNERS_EXTERNAL_ALLOW` value. */
	externalAllow: string;
	mode: TaskRunnerMode;
}

/**
 * Mirrors `parse_allowlist` in the Python runner: comma-separated, trimmed, empties
 * dropped, duplicates collapsed (it returns a set). Kept honest by the shared fixture
 * at `packages/@n8n/task-runner-python/tests/fixtures/allowlist-parsing.json`.
 */
function parseAllowlist(raw: string): string[] {
	const entries = raw
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	return [...new Set(entries)];
}

/**
 * The runner raises `ConfigurationError` on a wildcard combined with named modules
 * and refuses to start. Throwing here would take down every unrelated build, so the
 * combination is reported instead — as a misconfiguration, never as a permissive
 * allowlist, which would tell the builder its imports are fine when in fact no Python
 * will run at all.
 */
function isRejectedByRunner(entries: string[]): boolean {
	return entries.includes('*') && entries.length > 1;
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
	const stdlib = parseAllowlist(stdlibAllow);
	const external = parseAllowlist(externalAllow);
	const authoritative = mode === 'internal';

	if (isRejectedByRunner(stdlib) || isRejectedByRunner(external)) {
		// Only n8n's own runner reads these values. In external mode an invalid one says
		// nothing about whether the separately-configured runner will start, so report
		// the usual "cannot confirm" policy rather than declaring Python unusable.
		return authoritative
			? { stdlib: [], external: [], authoritative: true, misconfigured: true }
			: { stdlib: [], external: [], authoritative: false };
	}

	return { stdlib, external, authoritative };
}
