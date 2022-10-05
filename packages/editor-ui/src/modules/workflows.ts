import { makeRestApiRequest } from '@/api/helpers';
import { getNewWorkflow } from '@/api/workflows';
import { DUPLICATE_POSTFFIX, MAX_WORKFLOW_NAME_LENGTH, DEFAULT_NEW_WORKFLOW_NAME } from '@/constants';
import { IDataObject } from 'n8n-workflow';
import { ActionContext, Module } from 'vuex';
import {
	IExecutionsSummary,
	IRootState,
	IWorkflowsState,
} from '../Interface';

const module: Module<IWorkflowsState, IRootState> = {
	namespaced: true,
	state: {
		currentWorkflowExecutions: [],
	},
	actions: {
		getNewWorkflowData: async (context: ActionContext<IWorkflowsState, IRootState>, name?: string): Promise<object> => {
			let workflowData = {
				name: '',
				onboardingFlowEnabled: false,
			};
			try {
				workflowData = await getNewWorkflow(context.rootGetters.getRestApiContext, name);
			}
			catch (e) {
				// in case of error, default to original name
				workflowData.name = name || DEFAULT_NEW_WORKFLOW_NAME;
			}

			context.commit('setWorkflowName', { newName: workflowData.name }, { root: true });
			return workflowData;
		},

		getDuplicateCurrentWorkflowName: async (context: ActionContext<IWorkflowsState, IRootState>): Promise<string> => {
			const currentWorkflowName = context.rootGetters.workflowName;

			if (currentWorkflowName && (currentWorkflowName.length + DUPLICATE_POSTFFIX.length) >= MAX_WORKFLOW_NAME_LENGTH) {
				return currentWorkflowName;
			}

			let newName = `${currentWorkflowName}${DUPLICATE_POSTFFIX}`;

			try {
				const newWorkflow = await getNewWorkflow(context.rootGetters.getRestApiContext, newName );
				newName = newWorkflow.name;
			}
			catch (e) {
			}

			return newName;
		},
		async loadCurrentWorkflowExecutions(context: ActionContext<IWorkflowsState, IRootState>) {

			if (!context.rootGetters.workflowId) {
				return;
			}
			try {
				const activeExecutions = await makeRestApiRequest(
					context.rootGetters.getRestApiContext,
					'GET',
					`/executions-current`,
					{ filter: { workflowId: context.rootGetters.workflowId } } as IDataObject,
				);
				const finishedExecutions = await makeRestApiRequest(
					context.rootGetters.getRestApiContext,
					'GET',
					'/executions',
					{ filter: { workflowId: context.rootGetters.workflowId } } as IDataObject,
				);
				context.commit('setCurrentWorkflowExecutions', [...activeExecutions, ...finishedExecutions.results]);
			} catch (error) {
				throw(error);
			}
		},
	},
	mutations: {
		setCurrentWorkflowExecutions (state: IWorkflowsState, executions: IExecutionsSummary[]) {
			state.currentWorkflowExecutions = executions;
		},
	},
	getters: {
		currentWorkflowExecutions: (state: IWorkflowsState): IExecutionsSummary[] => {
			return state.currentWorkflowExecutions;
		},
	},
};

export default module;
