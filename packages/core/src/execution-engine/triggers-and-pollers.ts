import { Service } from '@n8n/di';
import { ApplicationError } from 'n8n-workflow';
import type {
	Workflow,
	INode,
	INodeExecutionData,
	IPollFunctions,
	IGetExecuteTriggerFunctions,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	WorkflowActivateMode,
	ITriggerResponse,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
} from 'n8n-workflow';

@Service()
export class TriggersAndPollers {
	/**
	 * Runs the given trigger node so that it can trigger the workflow when the node has data.
	 */
	async runTrigger(
		workflow: Workflow,
		node: INode,
		getTriggerFunctions: IGetExecuteTriggerFunctions,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<ITriggerResponse | undefined> {
		const triggerFunctions = getTriggerFunctions(workflow, node, additionalData, mode, activation);

		const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (!nodeType.trigger) {
			throw new ApplicationError('Node type does not have a trigger function defined', {
				extra: { nodeName: node.name },
				tags: { nodeType: node.type },
			});
		}

		if (mode === 'manual') {
			// In manual mode we do not just start the trigger function we also
			// want to be able to get informed as soon as the first data got emitted
			const triggerResponse = await nodeType.trigger.call(triggerFunctions);

			// Add the manual trigger response which resolves when the first time data got emitted
			triggerResponse!.manualTriggerResponse = new Promise((resolve, reject) => {
				triggerFunctions.emit = (
					(resolveEmit) =>
					(
						data: INodeExecutionData[][],
						responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
						donePromise?: IDeferredPromise<IRun>,
					) => {
						additionalData.hooks!.hookFunctions.sendResponse = [
							async (response: IExecuteResponsePromiseData): Promise<void> => {
								if (responsePromise) {
									responsePromise.resolve(response);
								}
							},
						];

						if (donePromise) {
							additionalData.hooks!.hookFunctions.workflowExecuteAfter?.unshift(
								async (runData: IRun): Promise<void> => {
									return donePromise.resolve(runData);
								},
							);
						}

						resolveEmit(data);
					}
				)(resolve);
				triggerFunctions.emitError = (
					(rejectEmit) =>
					(error: Error, responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>) => {
						additionalData.hooks!.hookFunctions.sendResponse = [
							async (): Promise<void> => {
								if (responsePromise) {
									responsePromise.reject(error);
								}
							},
						];

						rejectEmit(error);
					}
				)(reject);
			});

			return triggerResponse;
		}
		// In all other modes simply start the trigger
		return await nodeType.trigger.call(triggerFunctions);
	}

	/**
	 * Runs the given poller node so that it can trigger the workflow when the node has data.
	 */
	async runPoll(
		workflow: Workflow,
		node: INode,
		pollFunctions: IPollFunctions,
	): Promise<INodeExecutionData[][] | null> {
		const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (!nodeType.poll) {
			throw new ApplicationError('Node type does not have a poll function defined', {
				extra: { nodeName: node.name },
				tags: { nodeType: node.type },
			});
		}

		return await nodeType.poll.call(pollFunctions);
	}
}
