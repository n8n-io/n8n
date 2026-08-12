import { AGENTS_MD } from './agents-md';
import { GUARDRAILS_EXTENSION_SOURCE } from './guardrails-extension';
import { LIST_CREDENTIALS_EXTENSION_SOURCE } from './list-credentials-extension';
import { LOOKUP_DOCS_EXTENSION_SOURCE } from './lookup-docs-extension';
import { REPORT_PROGRESS_EXTENSION_SOURCE } from './report-progress-extension';
import { REPORT_RESULT_EXTENSION_SOURCE } from './report-result-extension';
import { SYSTEM_MD } from './system-md';

/**
 * In-sandbox harness assets (SYSTEM.md, AGENTS.md, pi extensions), keyed by
 * path relative to the sandbox workspace root. The sandbox bootstrap writes
 * these files before the first harness launch.
 *
 * Paths follow pi's project-local layout (@earendil-works/pi-coding-agent
 * 0.84.1): `.pi/SYSTEM.md` replaces the default system prompt for the
 * project, `AGENTS.md` is the workspace context file, and `.pi/extensions/`
 * is auto-discovered for extensions. `.pi/*` are project-trust-gated
 * resources — pi's non-interactive modes skip them unless the launch passes
 * `--approve` (or global settings set `defaultProjectTrust: "always"`), so
 * the harness exec must include that flag.
 */
export const harnessAssetFiles: Record<string, string> = {
	'.pi/SYSTEM.md': SYSTEM_MD,
	'AGENTS.md': AGENTS_MD,
	'.pi/extensions/n8n-guardrails.ts': GUARDRAILS_EXTENSION_SOURCE,
	'.pi/extensions/n8n-list-credentials.ts': LIST_CREDENTIALS_EXTENSION_SOURCE,
	'.pi/extensions/n8n-report-result.ts': REPORT_RESULT_EXTENSION_SOURCE,
	'.pi/extensions/n8n-report-progress.ts': REPORT_PROGRESS_EXTENSION_SOURCE,
	'.pi/extensions/n8n-lookup-docs.ts': LOOKUP_DOCS_EXTENSION_SOURCE,
};
