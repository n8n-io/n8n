import {
	IExternalHookFunctions,
	IWorkflowBase,
} from '../';

// TODO: Move that to interfaces
interface IExternalHooks {
	credentials?: {
		create?: Array<{ (this: IExternalHookFunctions): Promise<void>; }>
		delete?: Array<{ (this: IExternalHookFunctions, credentialId: string): Promise<void>; }>
		update?: Array<{ (this: IExternalHookFunctions, credentialId: string): Promise<void>; }>
	};
	workflow?: {
		create?: Array<{ (this: IExternalHookFunctions, workflowData: IWorkflowBase): Promise<void>; }>
		delete?: Array<{ (this: IExternalHookFunctions, workflowId: string): Promise<void>; }>
		update?: Array<{ (this: IExternalHookFunctions, workflowData: IWorkflowBase): Promise<void>; }>
	};
}

export = {
	credentials: {
		create: [
			async function (this: IExternalHookFunctions) {
				// console.log(this.DbCollections.Workflow);

				// Here any additional code can run or the creation blocked
				throw new Error('No additional credentials can be created.');
			},
		],
	},
	workflow: {
		update: [
			async function (this: IExternalHookFunctions, workflowData: IWorkflowBase) {
				console.log('update workflow hook');

				// const responseData = await this.DbCollections.Workflow!.findOne(workflowData.id);
				// console.log('workflowData');
				// console.log(responseData);
				// console.log(workflowData);

				// Here any additional code can run or the creation blocked
				throw new Error('Workflow can not be updated.');
			},
		],
	},
} as IExternalHooks;
