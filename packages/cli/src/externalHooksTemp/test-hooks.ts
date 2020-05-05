import {
	WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	IExternalHooks,
	IExternalHooksFunctions,
	IWorkflowBase,
	IWorkflowDb,
} from '../';


export = {
	credentials: {
		create: [
			async function (this: IExternalHooksFunctions) {
				// Here any additional code can run or the creation blocked
				// throw new Error('No additional credentials can be created.');
			},
		],
	},
	workflow: {
		execute: [
			async function (this: IExternalHooksFunctions, workflowData: IWorkflowDb, mode: WorkflowExecuteMode) {
				console.log('execute: ' + mode);
				// if (mode === 'integrated') {
				// 	throw new Error('Workflow can not be executed.');
				// }
			}
		],
		update: [
			async function (this: IExternalHooksFunctions, workflowData: IWorkflowBase) {
				console.log('update workflow hook');

				// const responseData = await this.dbCollections.Workflow!.findOne(workflowData.id);
				// console.log('workflowData');
				// console.log(responseData);
				// console.log(workflowData);

				// Here any additional code can run or the creation blocked
				// throw new Error('Workflow can not be updated.');
			},
		],
	},
} as IExternalHooks;
