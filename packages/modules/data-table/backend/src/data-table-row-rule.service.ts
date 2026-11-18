import type { DataTableRowRule, DataTableRowRuleImpact } from '@n8n/api-types';
import {
	WorkflowDependencyRepository,
	WorkflowHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { classifyTriggerIdentity, type INode, isTriggerNodeType } from 'n8n-workflow';

import { DataTableRepository } from './data-table.repository';
import { DataTableService } from './data-table.service';
import { DataTableValidationError } from './errors/data-table-validation.error';

/** True when a trigger of the workflow can start a run without a verified n8n user. */
export function hasTriggerWithoutUser(nodes: INode[]): boolean {
	return nodes.some(
		(node) =>
			!node.disabled &&
			isTriggerNodeType(node.type) &&
			!classifyTriggerIdentity(node.type, node.parameters).providesN8nIdentity,
	);
}

@Service()
export class DataTableRowRuleService {
	constructor(
		private readonly dataTableService: DataTableService,
		private readonly dataTableRepository: DataTableRepository,
		private readonly workflowDependencyRepository: WorkflowDependencyRepository,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async setRowRule(dataTableId: string, projectId: string, rowRule: DataTableRowRule | null) {
		await this.dataTableService.validateDataTableExists(dataTableId, projectId);
		if (rowRule) {
			const columns = await this.dataTableService.getColumns(dataTableId, projectId);
			for (const condition of rowRule.conditions) {
				const column = columns.find(({ name }) => name === condition.column);
				if (!column)
					throw new DataTableValidationError(`unknown column name '${condition.column}'`);
				if (column.type !== 'string') {
					throw new DataTableValidationError(
						`the row access column '${condition.column}' must be a text column`,
					);
				}
			}
		}
		await this.dataTableRepository.setRowRule(dataTableId, rowRule);
		return true;
	}

	/**
	 * The published workflows that use the table and can run without a verified
	 * user. A rule that refuses such runs would break them. Only a table id that
	 * the workflow names directly is indexed, not one from an expression.
	 */
	async getImpact(dataTableId: string, projectId: string): Promise<DataTableRowRuleImpact> {
		await this.dataTableService.validateDataTableExists(dataTableId, projectId);

		const dependencies = await this.workflowDependencyRepository.findDependenciesForResources(
			[dataTableId],
			['dataTableId'],
			false,
		);
		const publishedVersionIds = [
			...new Set(dependencies.flatMap(({ publishedVersionId: id }) => (id ? [id] : []))),
		];
		const versions =
			await this.workflowHistoryRepository.findNodesByVersionIds(publishedVersionIds);
		const affectedVersionIds = new Set(
			versions
				.filter(({ nodes }) => hasTriggerWithoutUser(nodes))
				.map(({ versionId }) => versionId),
		);
		const workflowIds = [
			...new Set(
				dependencies
					.filter(({ publishedVersionId: id }) => id && affectedVersionIds.has(id))
					.map(({ workflowId }) => workflowId),
			),
		];
		const workflows = await this.workflowRepository.findByIds(workflowIds, { fields: ['name'] });

		return {
			workflowsWithoutUser: workflows
				.map(({ id, name }) => ({ id, name }))
				.sort((a, b) => a.name.localeCompare(b.name)),
		};
	}
}
