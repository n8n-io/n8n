/**
 * Generates realistic mock output for nodes in the editor and hands it back for
 * pinning, so a builder can work downstream of a trigger without firing the real
 * event.
 *
 * Thin orchestration: the prompt, parsing, envelope repair and corrective retry
 * all live in `pin-data-generator` (shared with the eval paths). This service
 * contributes the three things that make it a product feature rather than an
 * eval utility — the instance's own model, credit metering, and a clear failure
 * when the instance has no model at all.
 */

import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	createAgentFromModel,
	extractText,
	tokenUsageToBuilderUsageItems,
	type BuilderUsageItem,
} from '@n8n/instance-ai';
import { PIN_DATA_SYSTEM_PROMPT, type WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { InstanceAiCreditService } from './instance-ai-credit.service';
import { InstanceAiModelService } from './instance-ai-model.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { generatePinData, PinDataDriftError, type PinDataGenerateFn } from './pin-data-generator';

export interface GenerateSampleDataRequest {
	workflow: WorkflowJSON;
	nodeNames: string[];
	/** Freeform steer, treated as the authoritative test scenario by the prompt. */
	hint?: string;
}

export interface GenerateSampleDataResult {
	pinData: Record<string, Array<Record<string, unknown>>>;
	/**
	 * `field-drift`: the data is usable but some field names do not match the
	 * node's declared schema, so downstream expressions may not resolve.
	 */
	warning?: 'field-drift';
}

/**
 * Threadless action, but `claimRunUsage` is thread-keyed. A synthetic id is safe:
 * the billing call takes it as a label, and the per-thread display total lookup
 * simply finds no thread and skips.
 */
const SAMPLE_DATA_THREAD_PREFIX = 'sample-data';

@Service()
export class InstanceAiSampleDataService {
	constructor(
		private readonly modelService: InstanceAiModelService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly creditService: InstanceAiCreditService,
		private readonly logger: Logger,
	) {}

	async generateForNodes(
		user: User,
		{ workflow, nodeNames, hint }: GenerateSampleDataRequest,
	): Promise<GenerateSampleDataResult> {
		// Without this the call reaches the provider with no key and fails as an
		// opaque auth error — `resolveAgentModelConfig` happily returns a bare model
		// id when nothing is configured.
		if (!(await this.settingsService.isModelConfigured())) {
			throw new ForbiddenError(
				'Sample data generation needs an AI model. Instance AI is not configured on this instance.',
			);
		}

		const modelConfig = await this.modelService.resolveAgentModelConfig(user);
		const agent = createAgentFromModel(`${SAMPLE_DATA_THREAD_PREFIX}-generator`, {
			modelConfig,
			instructions: PIN_DATA_SYSTEM_PROMPT,
			cache: true,
		});

		// The generator may call this twice (initial plus corrective retry); both
		// have to be billed, hence accumulating here rather than reading a result.
		const usage: BuilderUsageItem[] = [];
		const generate: PinDataGenerateFn = async (prompt, options) => {
			const result = await agent.generate(prompt, options);
			if (result.model && result.usage) {
				usage.push(...tokenUsageToBuilderUsageItems(result.model, result.usage));
			}
			return extractText(result);
		};

		try {
			const pinData = await generatePinData({
				workflow,
				nodeNames,
				outputSchemaLookup: this.loadNodesAndCredentials.createOutputSchemaLookup(),
				generate,
				// `dataDescription`, not `testScenario`: the latter is authoritative eval
				// state the model must reproduce exactly (down to preferring a boring
				// empty result), which would fight a user steering the flavour of the data.
				instructions: hint ? { dataDescription: hint } : undefined,
			});
			await this.claimCredits(user, usage, 'completed');
			return { pinData };
		} catch (error) {
			if (error instanceof PinDataDriftError) {
				// Imperfect field names still beat hand-writing JSON; the caller warns.
				this.logger.debug('Serving sample data that drifted from the declared schema', {
					nodeNames,
					violations: error.violations,
				});
				await this.claimCredits(user, usage, 'completed');
				return { pinData: error.pinData, warning: 'field-drift' };
			}

			await this.claimCredits(user, usage, 'errored');
			throw error;
		}
	}

	/** Best-effort: a billing outage must never turn into a failed button. */
	private async claimCredits(
		user: User,
		usage: BuilderUsageItem[],
		status: 'completed' | 'errored',
	): Promise<void> {
		if (usage.length === 0) return;

		try {
			await this.creditService.claimRunUsage(
				user,
				`${SAMPLE_DATA_THREAD_PREFIX}:${user.id}`,
				`${SAMPLE_DATA_THREAD_PREFIX}:${nanoid()}`,
				usage,
				status,
			);
		} catch (error) {
			this.logger.warn('Failed to claim sample data generation credits', {
				userId: user.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
