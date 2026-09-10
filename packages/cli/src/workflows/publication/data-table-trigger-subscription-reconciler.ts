import {
	DataTableRowAutomationRepository,
	DataTableTriggerSubscriptionRepository,
	TransactionRunner,
	WorkflowPublishedVersionRepository,
	type NewDataTableTriggerSubscription,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	DATA_TABLE_TRIGGER_NODE_TYPE,
	UserError,
	type DataTableTriggerEvent,
	type INode,
} from 'n8n-workflow';

import { DataTableService } from '@/modules/data-table/data-table.service';
import { OwnershipService } from '@/services/ownership.service';

const supportedEvents = new Set(['rowInserted', 'rowDeleted', 'columnUpdated']);

/** Mirrors the node's `event` default, which saved workflows omit when unchanged. */
const defaultEvent: DataTableTriggerEvent = 'rowInserted';

function isSupportedEvent(value: unknown): value is DataTableTriggerEvent {
	return typeof value === 'string' && supportedEvents.has(value);
}

@Service()
export class DataTableTriggerSubscriptionReconciler {
	constructor(
		private readonly ownershipService: OwnershipService,
		private readonly dataTableService: DataTableService,
		private readonly subscriptionRepository: DataTableTriggerSubscriptionRepository,
		private readonly publishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly rowAutomationRepository: DataTableRowAutomationRepository,
	) {}

	async reconcileAll(): Promise<void> {
		const published = await this.publishedVersionRepository.find({
			relations: { publishedVersion: true },
		});
		for (const record of published) {
			const subscriptions = await this.prepare(
				record.workflowId,
				record.publishedVersion?.nodes ?? [],
			);
			await this.transactionRunner.run({}, async (ctx) => {
				const currentVersionId = await this.publishedVersionRepository.getPublishedVersionId(
					record.workflowId,
					ctx,
				);
				if (currentVersionId !== record.publishedVersionId) return;
				await this.replace(record.workflowId, subscriptions, ctx);
			});
		}
	}

	async prepare(workflowId: string, nodes: INode[]): Promise<NewDataTableTriggerSubscription[]> {
		const triggerNodes = nodes.filter(
			(node) => node.type === DATA_TABLE_TRIGGER_NODE_TYPE && node.disabled !== true,
		);
		if (triggerNodes.length === 0) return [];

		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);
		const subscriptions: NewDataTableTriggerSubscription[] = [];
		for (const node of triggerNodes) {
			const event = node.parameters.event ?? defaultEvent;
			if (!isSupportedEvent(event)) {
				throw new UserError(`Data Table Trigger "${node.name}" has an invalid event`);
			}

			const dataTableId = await this.resolveDataTableId(node, project.id);
			const dataTable = await this.dataTableService.getOne(dataTableId, project.id);
			const columnId =
				event === 'columnUpdated' ? this.resolveResourceValue(node.parameters.columnId) : null;
			if (
				event === 'columnUpdated' &&
				(!columnId || !dataTable.columns.some((column) => column.id === columnId))
			) {
				throw new UserError(
					`Data Table Trigger "${node.name}" references a column that does not exist`,
				);
			}

			subscriptions.push({
				workflowId,
				nodeId: node.id,
				projectId: project.id,
				dataTableId,
				event,
				columnId,
			});
		}

		return subscriptions;
	}

	async replace(
		workflowId: string,
		subscriptions: NewDataTableTriggerSubscription[],
		ctx: OperationContext,
	): Promise<void> {
		await this.subscriptionRepository.replaceForWorkflow(workflowId, subscriptions, ctx);
		// Row states belong to a published trigger node. Unpublishing or removing it clears them.
		await this.rowAutomationRepository.deleteForWorkflowExcept(
			workflowId,
			subscriptions.map((subscription) => subscription.nodeId),
			ctx,
		);
	}

	private async resolveDataTableId(node: INode, projectId: string): Promise<string> {
		const locator = node.parameters.dataTableId;
		if (typeof locator === 'string') return locator;
		if (!this.isResourceLocator(locator)) {
			throw new UserError(`Data Table Trigger "${node.name}" has no Data Table`);
		}
		if (locator.mode !== 'name') return locator.value;

		const [match] = await this.dataTableService.findDataTablesByNamesInProject(projectId, [
			locator.value,
		]);
		if (!match) {
			throw new UserError(
				`Data Table Trigger "${node.name}" references a Data Table that does not exist`,
			);
		}
		return match.id;
	}

	private resolveResourceValue(value: unknown): string | null {
		if (typeof value === 'string') return value;
		return this.isResourceLocator(value) ? value.value : null;
	}

	private isResourceLocator(
		value: unknown,
	): value is { mode: 'list' | 'id' | 'name'; value: string } {
		return (
			typeof value === 'object' &&
			value !== null &&
			'mode' in value &&
			(value.mode === 'list' || value.mode === 'id' || value.mode === 'name') &&
			'value' in value &&
			typeof value.value === 'string'
		);
	}
}
