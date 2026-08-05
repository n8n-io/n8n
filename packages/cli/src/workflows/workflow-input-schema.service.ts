import { Service } from '@n8n/di';
import { LoadWorkflowNodeContext } from 'n8n-core';
import type { FieldValueOption, INode, IWorkflowBase } from 'n8n-workflow';
import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	Workflow,
	getFieldEntries,
	PASSTHROUGH,
} from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

/** Why a workflow cannot be offered for direct running. */
export type IneligibleReason =
	/** Nothing a caller can start the workflow from. */
	| 'no-start-node'
	/**
	 * The workflow runs itself on a shared schedule. Offering per-person runs on
	 * top of that would silently double up, so it is excluded rather than hidden.
	 */
	| 'own-schedule'
	/** Accepts arbitrary data, so there is no contract to build a form from. */
	| 'passthrough-input';

/** The trigger a caller enters the workflow through. */
export type StartTrigger =
	/** Declares named, typed inputs — the run form is built from them. */
	| 'execute-workflow-trigger'
	/** Compat path for workflows written before the contract existed: takes no input. */
	| 'manual-trigger';

export type WorkflowInputSchema =
	| { eligible: true; trigger: StartTrigger; fields: FieldValueOption[] }
	| { eligible: false; reason: IneligibleReason };

/**
 * Reads the input contract a workflow offers to whoever runs it.
 *
 * The contract is declared on the Execute Workflow Trigger and is what a run
 * surface renders its form from, so eligibility and schema are answered
 * together: a workflow with no readable contract is not offerable, and the
 * caller should not have to ask twice.
 */
@Service()
export class WorkflowInputSchemaService {
	constructor(private readonly nodeTypes: NodeTypes) {}

	async describe(workflowData: IWorkflowBase): Promise<WorkflowInputSchema> {
		const enabled = workflowData.nodes.filter((node) => !node.disabled);

		if (enabled.some((node) => node.type === SCHEDULE_TRIGGER_NODE_TYPE)) {
			return { eligible: false, reason: 'own-schedule' };
		}

		const triggerNode = enabled.find((node) => node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);

		if (!triggerNode) {
			// A manual trigger carries no contract, so it is offerable but takes no
			// input. Kept as a compatibility path for workflows written before the
			// Execute Workflow Trigger became the way to declare one.
			const hasManualTrigger = enabled.some((node) => node.type === MANUAL_TRIGGER_NODE_TYPE);
			return hasManualTrigger
				? { eligible: true, trigger: 'manual-trigger', fields: [] }
				: { eligible: false, reason: 'no-start-node' };
		}

		const { dataMode, fields } = await this.readFieldEntries(workflowData, triggerNode);

		if (dataMode === PASSTHROUGH) {
			return { eligible: false, reason: 'passthrough-input' };
		}

		return { eligible: true, trigger: 'execute-workflow-trigger', fields };
	}

	/**
	 * Reads the trigger's declared fields through a node context, the same way
	 * the parent editor's resource mapper does, so a contract renders identically
	 * wherever it is read.
	 */
	private async readFieldEntries(workflowData: IWorkflowBase, triggerNode: INode) {
		const singleNodeWorkflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: [triggerNode],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflowData.id,
			workflowSettings: workflowData.settings,
		});

		const context = new LoadWorkflowNodeContext(singleNodeWorkflow, triggerNode, {
			...additionalData,
			currentNodeParameters: triggerNode.parameters,
		});

		return getFieldEntries(context);
	}
}
