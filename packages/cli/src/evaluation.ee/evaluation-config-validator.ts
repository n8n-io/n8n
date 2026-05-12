import type {
	EvaluationApiError,
	EvaluationMetric,
	UpsertEvaluationConfigDto,
} from '@n8n/api-types';
import { EvaluationErrorCode } from '@n8n/api-types';
import type { EvaluationConfig, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { getChildNodes, getParentNodes, mapConnectionsByDestination } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';

import { LlmJudgeProviderRegistry } from './llm-judge-provider-registry';

const RESERVED_PREFIX = '__eval_';

export interface ValidateArgs {
	workflow: IWorkflowBase;
	config: UpsertEvaluationConfigDto | EvaluationConfig;
	user: User;
}

@Service()
export class EvaluationConfigValidator {
	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly providerRegistry: LlmJudgeProviderRegistry,
	) {}

	async validate(args: ValidateArgs): Promise<EvaluationApiError[]> {
		const errors: EvaluationApiError[] = [];
		this.checkNodeReferences(args, errors);
		this.checkReservedPrefix(args, errors);
		this.checkEntryAmbiguity(args, errors);
		this.checkReachability(args, errors);
		this.checkMetricUniqueness(args, errors);
		this.checkBooleanCoercion(args, errors);
		this.checkDatasetSource(args, errors);
		await this.checkDataTableAccess(args, errors);
		await this.checkLlmJudgeProvidersAndCredentials(args, errors);
		return errors;
	}

	private getNodeByName(workflow: IWorkflowBase, name: string): INode | undefined {
		return workflow.nodes.find((n) => n.name === name);
	}

	private llmJudgeMetrics(
		config: UpsertEvaluationConfigDto | EvaluationConfig,
	): Array<Extract<EvaluationMetric, { type: 'llm_judge' }>> {
		return config.metrics.filter(
			(m): m is Extract<EvaluationMetric, { type: 'llm_judge' }> => m.type === 'llm_judge',
		);
	}

	private checkNodeReferences(args: ValidateArgs, errors: EvaluationApiError[]): void {
		const { workflow, config } = args;
		if (!this.getNodeByName(workflow, config.startNodeName)) {
			errors.push({
				code: EvaluationErrorCode.START_NODE_NOT_FOUND,
				message: `Start node "${config.startNodeName}" was not found on the workflow`,
				details: { nodeName: config.startNodeName, field: 'startNodeName' },
			});
		}
		if (!this.getNodeByName(workflow, config.endNodeName)) {
			errors.push({
				code: EvaluationErrorCode.END_NODE_NOT_FOUND,
				message: `End node "${config.endNodeName}" was not found on the workflow`,
				details: { nodeName: config.endNodeName, field: 'endNodeName' },
			});
		}
	}

	private checkReservedPrefix(args: ValidateArgs, errors: EvaluationApiError[]): void {
		for (const node of args.workflow.nodes) {
			if (node.name.startsWith(RESERVED_PREFIX)) {
				errors.push({
					code: EvaluationErrorCode.RESERVED_PREFIX_IN_USE,
					message: `Node "${node.name}" uses the reserved "${RESERVED_PREFIX}" prefix`,
					details: { nodeName: node.name },
				});
			}
		}
	}

	private checkEntryAmbiguity(args: ValidateArgs, errors: EvaluationApiError[]): void {
		const { workflow, config } = args;
		if (!this.getNodeByName(workflow, config.startNodeName)) return;

		const byDest = mapConnectionsByDestination(workflow.connections);
		const parents = getParentNodes(byDest, config.startNodeName, 'main', 1);

		if (parents.length > 1) {
			errors.push({
				code: EvaluationErrorCode.AMBIGUOUS_ENTRY_NODE,
				message: `Entry node "${config.startNodeName}" has multiple upstream parents (${parents.join(', ')})`,
				details: { nodeName: config.startNodeName },
			});
		}
	}

	private checkReachability(args: ValidateArgs, errors: EvaluationApiError[]): void {
		const { workflow, config } = args;
		if (!this.getNodeByName(workflow, config.startNodeName)) return;
		if (!this.getNodeByName(workflow, config.endNodeName)) return;
		if (config.startNodeName === config.endNodeName) return;

		const descendants = new Set(getChildNodes(workflow.connections, config.startNodeName, 'main'));
		if (!descendants.has(config.endNodeName)) {
			errors.push({
				code: EvaluationErrorCode.END_NODE_UNREACHABLE,
				message: `End node "${config.endNodeName}" is not reachable from start node "${config.startNodeName}"`,
				details: { nodeName: config.endNodeName, field: 'endNodeName' },
			});
		}
	}

	private checkMetricUniqueness(args: ValidateArgs, errors: EvaluationApiError[]): void {
		const seenIds = new Map<string, number>();
		const seenNames = new Map<string, number>();
		for (const m of args.config.metrics) {
			seenIds.set(m.id, (seenIds.get(m.id) ?? 0) + 1);
			seenNames.set(m.name, (seenNames.get(m.name) ?? 0) + 1);
		}
		for (const [id, count] of seenIds) {
			if (count > 1) {
				errors.push({
					code: EvaluationErrorCode.DUPLICATE_METRIC_ID,
					message: `Metric id "${id}" appears ${count} times`,
					details: { metricId: id },
				});
			}
		}
		for (const [name, count] of seenNames) {
			if (count > 1) {
				errors.push({
					code: EvaluationErrorCode.DUPLICATE_METRIC_NAME,
					message: `Metric name "${name}" appears ${count} times`,
					details: { metricName: name },
				});
			}
		}
	}

	private checkBooleanCoercion(args: ValidateArgs, errors: EvaluationApiError[]): void {
		for (const metric of args.config.metrics) {
			if (metric.type !== 'expression') continue;
			if (metric.config.outputType !== 'boolean') continue;
			if (!isCoercibleBooleanExpression(metric.config.expression)) {
				errors.push({
					code: EvaluationErrorCode.BOOLEAN_COERCION_UNSUPPORTED,
					message: `Metric "${metric.name}" expression cannot be coerced into a boolean`,
					details: { metricId: metric.id, metricName: metric.name, field: 'config.expression' },
				});
			}
		}
	}

	private checkDatasetSource(args: ValidateArgs, errors: EvaluationApiError[]): void {
		if (args.config.datasetSource === 'google_sheets') {
			errors.push({
				code: EvaluationErrorCode.UNSUPPORTED_DATASET_SOURCE,
				message: 'Google Sheets datasets are accepted by the schema but not yet runnable',
				details: { field: 'datasetSource' },
			});
		}
	}

	private async checkDataTableAccess(
		args: ValidateArgs,
		errors: EvaluationApiError[],
	): Promise<void> {
		if (args.config.datasetSource !== 'data_table') return;
		const datasetRef = args.config.datasetRef as { dataTableId: string };
		const { dataTableId } = datasetRef;
		const table = await this.dataTableRepository.findOne({
			where: { id: dataTableId },
			relations: ['project'],
		});
		if (!table) {
			errors.push({
				code: EvaluationErrorCode.DATASET_NOT_FOUND,
				message: `Data table "${dataTableId}" was not found`,
				details: { field: 'datasetRef.dataTableId' },
			});
			return;
		}
		// Project-relation access check is deferred — the controller already enforces
		// workflow-level access (workflow:update) and the data-table service guards
		// reads via its own permission layer when the run dispatches.
	}

	private async checkLlmJudgeProvidersAndCredentials(
		args: ValidateArgs,
		errors: EvaluationApiError[],
	): Promise<void> {
		const metrics = this.llmJudgeMetrics(args.config);
		for (const metric of metrics) {
			const entry = this.providerRegistry.get(metric.config.provider);
			if (!entry) {
				errors.push({
					code: EvaluationErrorCode.LLM_PROVIDER_UNSUPPORTED,
					message: `LLM provider "${metric.config.provider}" is not supported`,
					details: {
						nodeType: metric.config.provider,
						metricId: metric.id,
						metricName: metric.name,
					},
				});
				continue;
			}
			const credential = await this.credentialsFinder.findCredentialForUser(
				metric.config.credentialId,
				args.user,
				['credential:read'],
			);
			if (!credential) {
				errors.push({
					code: EvaluationErrorCode.LLM_CREDENTIAL_ACCESS_DENIED,
					message: `Credential "${metric.config.credentialId}" is not accessible to the user`,
					details: {
						credentialId: metric.config.credentialId,
						metricId: metric.id,
						metricName: metric.name,
					},
				});
				continue;
			}
			const accepted = entry.credentialTypes.map((c) => c.name);
			if (!accepted.includes(credential.type)) {
				errors.push({
					code: EvaluationErrorCode.LLM_CREDENTIAL_TYPE_MISMATCH,
					message: `Credential type "${credential.type}" does not match provider "${entry.nodeType}" (expected one of: ${accepted.join(', ')})`,
					details: {
						credentialId: metric.config.credentialId,
						metricId: metric.id,
						metricName: metric.name,
						nodeType: entry.nodeType,
					},
				});
			}
		}
	}
}

/**
 * Single source of truth for boolean coercion compatibility.
 * Used by the validator (PR 3) and the compiler (PR 4) so the wrapped `={{ (...) ? 1 : 0 }}` shape
 * is consistent.
 *
 * Coercible:
 *   - Plain literals (`true`, `false`, `=true`)
 *   - Single-segment expressions (`={{ x === y }}`)
 * Not coercible:
 *   - Multiple expression segments mixed with literal text (`=foo {{x}} bar {{y}}`)
 */
export function isCoercibleBooleanExpression(expression: string): boolean {
	const trimmed = expression.trimStart();
	if (!trimmed.startsWith('=')) return true;
	const body = trimmed.slice(1).trim();
	const segmentMatches = body.match(/\{\{[\s\S]*?\}\}/g) ?? [];
	if (segmentMatches.length === 0) return true;
	const stripped = body.replace(/\{\{[\s\S]*?\}\}/g, '').trim();
	return stripped === '' && segmentMatches.length === 1;
}
