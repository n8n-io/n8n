import {
	IGetExecuteTriggerFunctions,
	ITriggerResponse,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';


export interface WorkflowData {
	workflow: Workflow;
	triggerResponse?: ITriggerResponse;
}

export class ActiveWorkflows {
	private workflowData: {
		[key: string]: WorkflowData;
	} = {};


	/**
	 * Returns if the workflow is active
	 *
	 * @param {string} id The id of the workflow to check
	 * @returns {boolean}
	 * @memberof ActiveWorkflows
	 */
	isActive(id: string): boolean {
		return this.workflowData.hasOwnProperty(id);
	}


	/**
	 * Returns the ids of the currently active workflows
	 *
	 * @returns {string[]}
	 * @memberof ActiveWorkflows
	 */
	allActiveWorkflows(): string[] {
		return Object.keys(this.workflowData);
	}


	/**
	 * Returns the Workflow data for the workflow with
	 * the given id if it is currently active
	 *
	 * @param {string} id
	 * @returns {(WorkflowData | undefined)}
	 * @memberof ActiveWorkflows
	 */
	get(id: string): WorkflowData | undefined {
		return this.workflowData[id];
	}


	/**
	 * Makes a workflow active
	 *
	 * @param {string} id The id of the workflow to activate
	 * @param {Workflow} workflow The workflow to activate
	 * @param {IWorkflowExecuteAdditionalData} additionalData The additional data which is needed to run workflows
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflows
	 */
	async add(id: string, workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData, getTriggerFunctions: IGetExecuteTriggerFunctions): Promise<void> {
		console.log('ADD ID (active): ' + id);

		this.workflowData[id] = {
			workflow
		};
		const triggerNodes = workflow.getTriggerNodes();

		let triggerResponse: ITriggerResponse | undefined;
		for (const triggerNode of triggerNodes) {
			triggerResponse = await workflow.runTrigger(triggerNode, getTriggerFunctions, additionalData, 'trigger');
			if (triggerResponse !== undefined) {
				// If a response was given save it
				this.workflowData[id].triggerResponse = triggerResponse;
			}
		}
	}



	/**
	 * Makes a workflow inactive
	 *
	 * @param {string} id The id of the workflow to deactivate
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflows
	 */
	async remove(id: string): Promise<void> {
		console.log('REMOVE ID (active): ' + id);

		if (!this.isActive(id)) {
			// Workflow is currently not registered
			throw new Error(`The workflow with the id "${id}" is currently not active and can so not be removed`);
		}

		const workflowData = this.workflowData[id];

		if (workflowData.triggerResponse && workflowData.triggerResponse.closeFunction) {
			await workflowData.triggerResponse.closeFunction();
		}

		delete this.workflowData[id];
	}

}
