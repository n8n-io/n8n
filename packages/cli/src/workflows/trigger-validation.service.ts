import { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ActiveWorkflows } from 'n8n-core';
import { type INode, type Workflow, type IWorkflowBase } from 'n8n-workflow';

import { SingleTriggerError } from '@/errors/single-trigger.error';
import { TriggerParameterConflictError } from '@/errors/trigger-parameter-conflict.error';

/**
 * Triggers that cannot run test executions while the workflow is active.
 */
export const TRIGGERS_PREVENT_TEST_WHILE_ACTIVE: Set<string> = new Set([
	'n8n-nodes-base.kafkaTrigger',
]);

/**
 * Parameters that must be unique across all active workflows, keyed by trigger type.
 */
export const TRIGGERS_UNIQUE_PARAMETERS: Record<string, string[]> = {
	'n8n-nodes-base.kafkaTrigger': ['groupId'],
};

@Service()
export class TriggerValidationService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly activeWorkflows: ActiveWorkflows,
	) {}

	/**
	 * Validate before manual/test execution.
	 * - Checks if test run is allowed when workflow is active
	 * - Checks for parameter conflicts with other active workflows
	 *
	 * @throws SingleTriggerError if the workflow is active and contains a trigger that prevents test runs
	 * @throws TriggerParameterConflictError if a parameter conflict is found
	 */
	async validateManualExecution(
		workflowData: IWorkflowBase,
		isActive: boolean,
		triggerToStartFrom?: { name: string },
	): Promise<void> {
		this.checkTestRunAllowed(workflowData, isActive, triggerToStartFrom);
		await this.checkConflicts(workflowData, triggerToStartFrom);
	}

	/**
	 * Validate before workflow activation.
	 * Checks for parameter conflicts with other active workflows.
	 *
	 * @throws TriggerParameterConflictError if a conflict is found
	 */
	async validateWorkflowActivation(workflow: Workflow | WorkflowEntity): Promise<void> {
		const workflowId = workflow.id;
		const nodes = Object.values(workflow.nodes);
		const enabledNodes = nodes.filter((n) => !n.disabled);

		const hasUniqueParams = enabledNodes.some(
			(node) => TRIGGERS_UNIQUE_PARAMETERS[node.type]?.length,
		);

		if (!hasUniqueParams) return;

		const activeWorkflowIds = this.activeWorkflows
			.allActiveWorkflows()
			.filter((id) => id !== workflowId);

		if (!activeWorkflowIds.length) return;

		for (const activeWorkflowId of activeWorkflowIds) {
			const workflow = await this.workflowRepository.findById(activeWorkflowId);
			if (!workflow?.activeVersion) continue;

			this.assertNoConflicts(enabledNodes, workflow.activeVersion.nodes, workflow.name);
		}
	}

	/**
	 * Check if test run is allowed when workflow is active.
	 * Some triggers (like Kafka) cannot run test executions while the workflow is active.
	 */
	private checkTestRunAllowed(
		workflowData: IWorkflowBase,
		isActive: boolean,
		triggerToStartFrom?: { name: string },
	): void {
		if (!isActive) return;

		const pinData = workflowData.pinData ?? {};

		const triggers = workflowData.nodes.filter(
			(node) =>
				TRIGGERS_PREVENT_TEST_WHILE_ACTIVE.has(node.type) && !node.disabled && !pinData[node.name],
		);

		if (!triggers.length) return;

		if (triggerToStartFrom) {
			const trigger = triggers.find((n) => n.name === triggerToStartFrom.name);
			if (trigger) throw new SingleTriggerError(trigger.name);
		} else {
			const trigger = triggers[0];
			throw new SingleTriggerError(trigger.name);
		}
	}

	/**
	 * Check for parameter conflicts with other active workflows.
	 */
	private async checkConflicts(
		workflowData: IWorkflowBase,
		triggerToStartFrom?: { name: string },
	): Promise<void> {
		const triggersToCheck = this.getUniqueTriggers(workflowData, triggerToStartFrom);

		if (!triggersToCheck.length) return;

		const activeWorkflows = await this.workflowRepository.find({
			where: { active: true },
			relations: { activeVersion: true },
		});

		for (const activeWorkflow of activeWorkflows) {
			if (activeWorkflow.id === workflowData.id) continue;
			if (!activeWorkflow.activeVersion) continue;

			this.assertNoConflicts(
				triggersToCheck,
				activeWorkflow.activeVersion.nodes,
				activeWorkflow.name,
			);
		}
	}

	/**
	 * Get triggers that have unique parameter constraints.
	 * Excludes disabled and pinned nodes.
	 */
	private getUniqueTriggers(
		workflowData: IWorkflowBase,
		triggerToStartFrom?: { name: string },
	): INode[] {
		const pinData = workflowData.pinData ?? {};

		let triggersToCheck = workflowData.nodes.filter(
			(node) =>
				TRIGGERS_UNIQUE_PARAMETERS[node.type]?.length && !node.disabled && !pinData[node.name],
		);

		if (triggerToStartFrom) {
			triggersToCheck = triggersToCheck.filter((n) => n.name === triggerToStartFrom.name);
		}

		return triggersToCheck;
	}

	/**
	 * Assert that triggers don't conflict with active workflow nodes.
	 * @throws TriggerParameterConflictError if a conflict is found
	 */
	private assertNoConflicts(
		triggers: INode[],
		activeNodes: INode[],
		activeWorkflowName: string,
	): void {
		const conflictsMap = new Map<string, Map<string, Set<string>>>();

		for (const trigger of triggers) {
			const uniqueParams = TRIGGERS_UNIQUE_PARAMETERS[trigger.type];
			if (!uniqueParams) continue;

			if (!conflictsMap.has(trigger.type)) {
				conflictsMap.set(trigger.type, new Map());
			}
			const typeMap = conflictsMap.get(trigger.type)!;

			for (const name of uniqueParams) {
				const value = trigger.parameters?.[name] as string | undefined;
				if (value) {
					if (!typeMap.has(name)) {
						typeMap.set(name, new Set());
					}
					typeMap.get(name)!.add(value);
				}
			}
		}

		for (const activeNode of activeNodes) {
			if (activeNode.disabled) continue;

			const uniqueParams = TRIGGERS_UNIQUE_PARAMETERS[activeNode.type];
			if (!uniqueParams) continue;

			const typeMap = conflictsMap.get(activeNode.type);
			if (!typeMap) continue;

			for (const paramName of uniqueParams) {
				const activeParamValue = activeNode.parameters?.[paramName] as string | undefined;
				if (!activeParamValue) continue;

				const newValues = typeMap.get(paramName);
				if (newValues?.has(activeParamValue)) {
					throw new TriggerParameterConflictError(
						activeNode.type,
						paramName,
						activeParamValue,
						activeWorkflowName,
					);
				}
			}
		}
	}
}
