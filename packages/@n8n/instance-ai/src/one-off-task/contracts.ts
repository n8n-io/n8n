/**
 * One-off task sandboxes — frozen contracts between the four implementation
 * workstreams. See `docs/one-off-task-sandboxes.md` for the design.
 *
 * Workstreams and what each must prove:
 * - A (harness assets, `harness-assets/`): pi extensions enforce these
 *   contracts in-sandbox. Prove: report file validates against
 *   `harnessReportSchema`; redactor scrubs every value listed in the secrets
 *   manifest from tool results; `list_credentials` returns names only.
 * - B (sandbox lifecycle, `../workspace/`): implements `OneOffTaskSandbox`.
 *   Prove: bootstrap pins `ONE_OFF_TASK_PI_VERSION`; env vars reach only the
 *   harness exec; destroy runs on success, failure, and abort; relaunch
 *   reuses the same `--session-id`.
 * - C (credential resolution, `packages/cli` adapter): implements
 *   `OneOffTaskCredentialResolver`. Prove: access is rechecked at resolve
 *   time; OAuth resolves to a fresh access token only (no refresh token, no
 *   client secret); static-key fields map per `credentialEnvVarName`.
 * - D (orchestration, `../tools/`): the `run-one-off-task` tool. Prove: the
 *   task contract serializes into the pi prompt; `needs_credential` reports
 *   round-trip through suspend/resume into a relaunch; every streamed delta
 *   is scrubbed against injected values before emission.
 *
 * The in-sandbox extensions cannot import this module (they run under pi's
 * jiti loader without workspace resolution). Workstream A keeps a literal
 * copy of the schemas it needs; a unit test in this package asserts the copy
 * stays in sync with this file.
 */
import { z } from 'zod';

// ── Versions and in-sandbox paths ────────────────────────────────────────────

/** Pinned pi version — session-resume behavior was verified against this. */
export const ONE_OFF_TASK_PI_VERSION = '0.84.1';

/**
 * Directory inside the sandbox workspace for task plumbing. Everything the
 * host reads or writes (other than the harness's own code) lives here.
 */
export const TASK_DIR = '.n8n-task';

/** Secrets manifest, written by the host before the first harness launch. */
export const SECRETS_MANIFEST_PATH = `${TASK_DIR}/secrets-manifest.json`;

/** Final report, written by the `report_result` extension as pi's last act. */
export const REPORT_PATH = `${TASK_DIR}/report.json`;

/** Pi session storage (`--session-dir`), so the JSONL location is known. */
export const SESSION_DIR = `${TASK_DIR}/sessions`;

// ── Env var naming ───────────────────────────────────────────────────────────

/**
 * Deterministic env var name for an injected credential field:
 * `N8N_TASK_<CREDENTIAL>_<FIELD>`, upper-snake. The harness never guesses
 * names — it reads them from the secrets manifest — but one convention keeps
 * host code, prompts, and tests consistent.
 */
export function credentialEnvVarName(credentialName: string, field: string): string {
	const toUpperSnake = (value: string) =>
		value
			.replace(/[^a-zA-Z0-9]+/g, '_')
			.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
			.replace(/^_+|_+$/g, '')
			.toUpperCase();
	return `N8N_TASK_${toUpperSnake(credentialName)}_${toUpperSnake(field)}`;
}

// ── Secrets manifest (host → redaction extension) ───────────────────────────

export const secretsManifestSchema = z.object({
	version: z.literal(1),
	/** Env var names holding secret values. Names only — never values. */
	secrets: z.array(
		z.object({
			envVar: z.string(),
			/** Human label used in redaction markers, e.g. `[REDACTED:GOOGLE_TOKEN]`. */
			label: z.string(),
		}),
	),
});
export type SecretsManifest = z.infer<typeof secretsManifestSchema>;

// ── Task contract (orchestrator → harness prompt) ────────────────────────────

/** A credential already injected into the harness environment. */
export const injectedCredentialSchema = z.object({
	name: z.string(),
	type: z.string(),
	/** Env vars carrying this credential's values (from `credentialEnvVarName`). */
	envVars: z.array(z.object({ envVar: z.string(), field: z.string() })),
});

/**
 * The task contract. Workstream D serializes this into the pi prompt; the
 * schema (not the prose) is the contract.
 */
export const oneOffTaskContractSchema = z.object({
	/** What to accomplish, in user terms. */
	goal: z.string(),
	/** Hard constraints beyond the baked SYSTEM.md rules (e.g. "read-only"). */
	constraints: z.array(z.string()),
	/** What read-back verification must show for the task to count as done. */
	verification: z.string(),
	/** Credentials available in the environment right now. */
	credentials: z.array(injectedCredentialSchema),
	/**
	 * Catalog of further credentials the user could approve (names/types
	 * only), so the harness requests by name instead of guessing.
	 */
	credentialCatalog: z.array(z.object({ name: z.string(), type: z.string() })),
	/** Report from a previous task, for follow-ups. Never contains secrets. */
	priorReport: z.string().optional(),
});
export type OneOffTaskContract = z.infer<typeof oneOffTaskContractSchema>;

// ── Harness report (report_result extension → host) ─────────────────────────

const reportActionSchema = z.object({
	/** One executed step, e.g. "POST sheets.googleapis.com/v4/spreadsheets". */
	description: z.string(),
	service: z.string().optional(),
});

const reportVerificationSchema = z.object({
	check: z.string(),
	result: z.string(),
	passed: z.boolean(),
});

const reportArtifactSchema = z.object({
	label: z.string(),
	url: z.string(),
});

/**
 * Recipe for a credential that does not exist yet — the shape workstream D
 * maps onto the Templated Custom Auth setup flow (`credentials.tool.ts`).
 */
export const credentialRecipeRequestSchema = z.object({
	serviceName: z.string(),
	placeholders: z.array(
		z.object({
			name: z.string(),
			title: z.string(),
			info: z.string().optional(),
		}),
	),
	docsUrl: z.string().optional(),
	testUrl: z.string().optional(),
});

export const harnessReportSchema = z.discriminatedUnion('status', [
	z.object({
		status: z.literal('completed'),
		summary: z.string(),
		actions: z.array(reportActionSchema),
		verification: z.array(reportVerificationSchema),
		artifacts: z.array(reportArtifactSchema),
	}),
	z.object({
		status: z.literal('needs_credential'),
		/** What was done before pausing — becomes `priorReport` on relaunch. */
		progressSummary: z.string(),
		request: z.discriminatedUnion('kind', [
			/** An entry from the catalog in the task contract. */
			z.object({ kind: z.literal('existing'), credentialName: z.string() }),
			z.object({ kind: z.literal('new'), recipe: credentialRecipeRequestSchema }),
		]),
	}),
	z.object({
		status: z.literal('failed'),
		reason: z.string(),
		/** Best-effort: what already ran, so the user knows what exists. */
		actions: z.array(reportActionSchema),
	}),
]);
export type HarnessReport = z.infer<typeof harnessReportSchema>;

// ── Exit protocol ────────────────────────────────────────────────────────────
//
// Pi exit codes are not load-bearing. After the harness process exits, the
// host reads REPORT_PATH:
// - Valid report            → proceed per `status`.
// - Missing/invalid report  → unclean stop: report "task interrupted —
//   external state unknown" plus whatever the streamed events showed.

// ── Harness run result (sandbox lifecycle → tool) ───────────────────────────

export interface HarnessRunResult {
	/** Parsed REPORT_PATH, absent on unclean stop. */
	report?: HarnessReport;
	exitCode: number;
	/** Scrubbed tail of pi's stderr; present only on unclean stops. */
	stderrTail?: string;
}

/** Pi JSON-stream events the translation layer consumes (others ignored). */
export const piStreamEventSchema = z.object({
	type: z.string(),
});

/**
 * Event mapping (workstream D):
 *
 * | pi event (JSON stream)          | Instance AI event                    |
 * | ------------------------------- | ------------------------------------ |
 * | `message_update` text deltas    | `text-delta` (sandbox agentId)       |
 * | `tool_execution_start` / `end`  | tool events in the agent branch      |
 * | milestone progress              | `status`                             |
 * | process exit + report           | task completion → report card        |
 *
 * Every delta is scrubbed against the injected secret values host-side
 * before emission — this layer is the authoritative redaction point.
 */
export interface OneOffTaskSandbox {
	/** Install pi (pinned), write harness assets and the secrets manifest. */
	bootstrap(manifest: SecretsManifest): Promise<void>;
	/**
	 * Launch (or relaunch) the harness. Same `sessionId` across relaunches —
	 * pi's `--session-id` has create-or-open semantics. `env` carries secret
	 * values and exists only for this exec.
	 */
	runHarness(options: {
		prompt: string;
		sessionId: string;
		env: Record<string, string>;
		abortSignal: AbortSignal;
		onEvent: (event: unknown) => void;
	}): Promise<HarnessRunResult>;
	/** Idempotent; called in `finally` on every path. */
	destroy(): Promise<void>;
}

/**
 * How long a sandbox may wait between harness runs (the credential approval
 * window) before the lifecycle owner destroys it and the task is reported
 * incomplete. Communicated to the orchestrator on `needs_credential`;
 * enforced by the provider registry.
 */
export const ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS = 10 * 60_000;

/**
 * Provisioning boundary between the orchestration tool and the sandbox
 * lifecycle. `create` provisions a fresh sandbox for a new task; `reattach`
 * reconnects to a still-alive sandbox during the credential loop (the
 * process-local registry backing `reattach` also enforces the credential
 * wait timeout — destroy on expiry). `sandboxRef` is an opaque handle the
 * orchestrator round-trips through the `needs_credential` outcome.
 * `reattach` MUST throw on an unknown, destroyed, or expired ref — never
 * lazily recreate: the orchestrator treats that failure as an interrupted
 * task, and a silent fresh sandbox would misreport prior work as intact.
 */
export interface OneOffTaskSandboxProvider {
	create(): Promise<{ sandbox: OneOffTaskSandbox; sandboxRef: string }>;
	reattach(sandboxRef: string): Promise<OneOffTaskSandbox>;
}

// ── Credential resolution (workstream C, implemented in packages/cli) ───────

export const resolvedCredentialEnvSchema = z.object({
	/** Env var name → secret value, named per `credentialEnvVarName`. */
	envVars: z.record(z.string()),
	/** For OAuth: access-token expiry (ISO 8601). Absent for static keys. */
	expiresAt: z.string().optional(),
});
export type ResolvedCredentialEnv = z.infer<typeof resolvedCredentialEnvSchema>;

export interface OneOffTaskCredentialResolver {
	/**
	 * Decrypt credential `credentialId` into injectable env values.
	 * - Rechecks the user's access at call time; throws `UserError` on denial.
	 * - OAuth: refreshes first, returns only the fresh access token — never
	 *   the refresh token, never the client secret.
	 * - Static keys: one env var per field.
	 */
	resolveForOneOffTask(options: {
		credentialId: string;
		userId: string;
		projectId?: string;
	}): Promise<ResolvedCredentialEnv>;
}
