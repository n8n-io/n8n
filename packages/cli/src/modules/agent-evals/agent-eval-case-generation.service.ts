import type { Agent } from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import {
	MANAGED_CREDENTIAL_TOKEN,
	type AgentEvalDraftCase,
	type AgentJsonConfig,
	type GenerateDraftCasesOptions,
	type GenerateDraftCasesResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { AgentEvalDatasetRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InstanceWriteAccessService } from '@/services/instance-write-access.service';

import { AgentEvalsFlagGate } from './agent-evals-flag-gate';
import { AgentConfigService } from '../agents/agent-config.service';
import {
	buildAgentSummary,
	buildCaseGenerationUserPrompt,
	CASE_GENERATION_SYSTEM_PROMPT,
	deriveCapabilities,
	generatedCasesSchema,
} from './case-generation/case-generation-prompt';
import { sampleDimensionTuples } from './case-generation/dimensions';
import { isSupportedAgentProvider } from '../agents/json-config/credential-field-mapping';
import { resolveCredentialAwareModelConfig } from '../agents/json-config/model-config';
import { createAgentCredentialProvider } from '../agents/utils/agent-credential-provider';
import { DataTableService } from '../data-table/data-table.service';
import { DataTableNameConflictError } from '../data-table/errors/data-table-name-conflict.error';

const DEFAULT_CASE_COUNT = 6;
const MAX_CASE_COUNT = 20;

// Upper bound per generated field. The model output is untrusted (the prompt
// embeds the agent's own instructions), so persisted text can't balloon.
const MAX_CASE_TEXT_CHARS = 2_000;

// Bound a single generation so a hung provider can't pin the request.
const GENERATE_TIMEOUT_MS = 60_000;

// Dataset column roles → generated fields. `input` is the user message;
// `criteria` holds the plain-language "what to check". No `expectedOutput`:
// drafts have no gold answer and are never auto-graded.
const INPUT_COLUMN = 'input';
const CRITERIA_COLUMN = 'criteria';

// How many name variants ("… (2)", "… (3)") to try before giving up on a
// per-project name clash.
const MAX_NAME_ATTEMPTS = 20;

/**
 * Generates a handful of realistic draft eval cases from an agent's config
 * (name / instructions / tools) and persists them as an editable dataset.
 *
 * Uses dimension-tuple synthesis (see {@link sampleDimensionTuples}) rather than
 * a one-shot "give me test queries" call, so the cases vary across capability,
 * difficulty, and input flavor instead of clustering on the happy path. The
 * tuples are sampled deterministically in code and the model fills each with a
 * concrete `input` + plain-language `whatToCheck`.
 *
 * The generation call reuses the agent's own model + credential (resolved
 * exactly as the agent runtime does, via {@link resolveCredentialAwareModelConfig}),
 * so no separate provider config or entitlement is needed — the builder's own
 * API key does the work.
 *
 * Output is persisted as a Data Table (the cases are its rows) with an
 * {@link AgentEvalDataset} pointing at it — the same dataset mechanism the
 * agent-eval runner reads. Framed as drafts: the user reviews and edits them;
 * they are never auto-graded.
 */
@Service()
export class AgentEvalCaseGenerationService {
	constructor(
		private readonly logger: Logger,
		private readonly agentConfigService: AgentConfigService,
		private readonly credentialsService: CredentialsService,
		private readonly dataTableService: DataTableService,
		private readonly datasetRepository: AgentEvalDatasetRepository,
		private readonly flagGate: AgentEvalsFlagGate,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
	) {}

	/**
	 * Generate and persist draft cases for an agent. The caller is responsible for
	 * authorizing `user` against `projectId` — the REST layer must apply
	 * `@ProjectScope`. This resolves and uses the agent's own credential, so it
	 * must never be exposed on an unscoped route.
	 */
	async generateDraftCases(
		user: User,
		projectId: string,
		agentId: string,
		options: GenerateDraftCasesOptions = {},
	): Promise<GenerateDraftCasesResult> {
		await this.flagGate.assertEnabled(user);
		this.assertInstanceWriteAccess();

		const config = await this.agentConfigService.getConfig(agentId, projectId);
		const modelConfig = await this.resolveAgentModel(config, projectId, user);

		const count = clampCount(options.count);
		const capabilities = deriveCapabilities(config);
		const tuples = sampleDimensionTuples(capabilities, count);

		const summary = buildAgentSummary(config);
		const generated = await this.invokeModel(
			modelConfig,
			buildCaseGenerationUserPrompt(summary, tuples),
			tuples.length,
		);
		// Cap to the requested count and bound each field: the model output is
		// untrusted, so a runaway or prompt-injected response can't balloon the
		// persisted dataset.
		const cases = boundCases(generated, tuples.length);

		// Blank/whitespace names fall back to the agent-derived default.
		const trimmedName = options.datasetName?.trim();
		const baseName =
			trimmedName && trimmedName.length > 0 ? trimmedName : defaultDatasetName(config.name);

		const { datasetId, dataTableId } = await this.persistDataset(
			projectId,
			agentId,
			user.id,
			baseName,
			cases,
		);

		this.logger.debug('Generated draft eval cases', {
			agentId,
			datasetId,
			caseCount: cases.length,
		});

		return { datasetId, dataTableId, cases };
	}

	// ---- internals ----

	/**
	 * Block writes on a source-control read-only (protected) instance. This
	 * service writes a Data Table directly (bypassing the data-table controller),
	 * so it must mirror the controller's guard.
	 */
	private assertInstanceWriteAccess(): void {
		if (this.instanceWriteAccess.isReadOnly()) {
			throw new ForbiddenError(
				'Cannot generate eval cases on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	/**
	 * Resolve the agent's configured model + credential into a ready-to-use model
	 * config, the same way the agent runtime does. Rejects agents without a usable
	 * bring-your-own-key model (draft/unset, managed, or unsupported provider),
	 * since generation calls the provider directly with that credential.
	 */
	private async resolveAgentModel(config: AgentJsonConfig, projectId: string, user: User) {
		const { model, credential } = config;
		if (!model || !credential || credential === MANAGED_CREDENTIAL_TOKEN) {
			throw new UserError(
				'This agent needs a configured model and API-key credential before draft cases can be generated.',
			);
		}
		if (!isSupportedAgentProvider(getProviderPrefix(model))) {
			throw new UserError(
				`The agent's model provider is not supported for case generation ("${model}").`,
			);
		}

		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);
		return await resolveCredentialAwareModelConfig(model, credential, credentialProvider);
	}

	/**
	 * Call the model to fill the sampled scenarios with concrete cases. Trims each
	 * field and drops blank ones, then requires at least `expectedCount` valid
	 * cases so a partial (or empty) dataset is never persisted. One stricter retry
	 * on invalid / underfilled output (a real model's JSON can drift), then fail.
	 * Intentionally tool-less: the prompt embeds the agent's own (untrusted)
	 * instructions, so a planted directive can only bias the drafts, never trigger
	 * a tool.
	 */
	private async invokeModel(
		modelConfig: Awaited<ReturnType<typeof resolveCredentialAwareModelConfig>>,
		userPrompt: string,
		expectedCount: number,
	): Promise<AgentEvalDraftCase[]> {
		// Lazy-load the agents SDK so it stays out of the boot path for instances
		// that never generate cases.
		const { Agent } = await import('@n8n/agents');
		const agent: Agent = new Agent('agent-eval-case-generation')
			.model(modelConfig)
			.instructions(CASE_GENERATION_SYSTEM_PROMPT)
			.structuredOutput(generatedCasesSchema);

		const attempt = async (prompt: string): Promise<AgentEvalDraftCase[] | null> => {
			const result = await agent.generate(prompt, {
				abortSignal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
			});
			const parsed = generatedCasesSchema.safeParse(result.structuredOutput);
			if (!parsed.success) return null;
			// Trim and drop cases with a blank input or check — a whitespace-only
			// field would persist an unusable draft row.
			const cases = parsed.data.cases
				.map((c) => ({ input: c.input.trim(), whatToCheck: c.whatToCheck.trim() }))
				.filter((c) => c.input.length > 0 && c.whatToCheck.length > 0);
			// Require the full requested count so a partial dataset is never persisted.
			return cases.length >= expectedCount ? cases : null;
		};

		const first = await attempt(userPrompt);
		if (first) return first;

		const retry = await attempt(
			`${userPrompt}\n\nReturn ONLY a JSON object with exactly ${expectedCount} cases matching the required schema — no extra keys, no prose.`,
		);
		if (retry) return retry;

		throw new OperationalError(
			'Case generation returned fewer valid cases than requested after a retry',
		);
	}

	/**
	 * Create the backing Data Table (input + criteria columns), insert the rows,
	 * and create the dataset pointer. Retries on a per-project name clash with a
	 * numeric suffix. If anything after table creation fails (row insert or dataset
	 * creation), the table is deleted so a populated-but-unreferenced dataset is
	 * never left behind; a cleanup failure is logged without masking the original
	 * error.
	 */
	private async persistDataset(
		projectId: string,
		agentId: string,
		createdById: string,
		baseName: string,
		cases: AgentEvalDraftCase[],
	): Promise<{ datasetId: string; dataTableId: string }> {
		const columns = [
			{ name: INPUT_COLUMN, type: 'string' as const },
			{ name: CRITERIA_COLUMN, type: 'string' as const },
		];

		let table: Awaited<ReturnType<DataTableService['createDataTable']>> | undefined;
		let name = baseName;
		for (let attempt = 0; table === undefined; attempt++) {
			name = attempt === 0 ? baseName : suffixedName(baseName, attempt + 1);
			try {
				table = await this.dataTableService.createDataTable(projectId, { name, columns });
			} catch (error) {
				if (error instanceof DataTableNameConflictError && attempt < MAX_NAME_ATTEMPTS - 1) {
					continue;
				}
				throw error;
			}
		}

		try {
			const rows = cases.map((c) => ({
				[INPUT_COLUMN]: c.input,
				[CRITERIA_COLUMN]: c.whatToCheck,
			}));
			await this.dataTableService.insertRows(table.id, projectId, rows);

			const dataset = await this.datasetRepository.createDataset({
				name,
				agentId,
				datasetSource: 'data_table',
				datasetRef: { dataTableId: table.id },
				columnMapping: { input: INPUT_COLUMN, criteria: CRITERIA_COLUMN },
				createdById,
			});
			return { datasetId: dataset.id, dataTableId: table.id };
		} catch (error) {
			await this.rollBackDataTable(table.id, projectId);
			throw error;
		}
	}

	/** Delete a just-created table after a failed persist; never mask the cause. */
	private async rollBackDataTable(dataTableId: string, projectId: string): Promise<void> {
		try {
			await this.dataTableService.deleteDataTable(dataTableId, projectId);
		} catch (cleanupError) {
			this.logger.error('Failed to clean up data table after case-generation failure', {
				dataTableId,
				error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
			});
		}
	}
}

/** Cap the model output to the requested count and bound each field's length. */
function boundCases(cases: AgentEvalDraftCase[], limit: number): AgentEvalDraftCase[] {
	return cases.slice(0, limit).map((c) => ({
		input: truncateText(c.input, MAX_CASE_TEXT_CHARS),
		whatToCheck: truncateText(c.whatToCheck, MAX_CASE_TEXT_CHARS),
	}));
}

function truncateText(text: string, max: number): string {
	return text.length > max ? text.slice(0, max) : text;
}

function clampCount(count: number | undefined): number {
	if (count === undefined || !Number.isFinite(count)) return DEFAULT_CASE_COUNT;
	return Math.min(Math.max(Math.trunc(count), 1), MAX_CASE_COUNT);
}

function defaultDatasetName(agentName: string): string {
	return truncateName(`Draft cases for ${agentName}`);
}

/** Append " (n)" while keeping the whole name within the 128-char limit. */
function suffixedName(baseName: string, n: number): string {
	const suffix = ` (${n})`;
	return `${truncateName(baseName, 128 - suffix.length)}${suffix}`;
}

function truncateName(name: string, max = 128): string {
	return truncateText(name, max);
}
