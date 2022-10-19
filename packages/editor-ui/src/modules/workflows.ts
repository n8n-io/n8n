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
		activeWorkflowExecution: null,
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

		getDuplicateCurrentWorkflowName: async (context: ActionContext<IWorkflowsState, IRootState>, currentWorkflowName: string): Promise<string> => {
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
		async loadCurrentWorkflowExecutions (
			context: ActionContext<IWorkflowsState, IRootState>,
			filter: { finished: boolean, status: string },
		): Promise<IExecutionsSummary[]> {
			let activeExecutions = [];
			let finishedExecutions = [];
			const requestFilter: IDataObject = { workflowId: context.rootGetters.workflowId };

			if (!context.rootGetters.workflowId) {
				return [];
			}
			try {
				if (filter.status === ''|| !filter.finished) {
					activeExecutions = await makeRestApiRequest(
						context.rootGetters.getRestApiContext,
						'GET',
						`/executions-current`,
						{ filter: requestFilter },
					);
				}
				if (filter.status === '' || filter.finished) {
					if (filter.status === 'waiting') {
						requestFilter.waitTill = true;
					} else if (filter.status !== '')  {
						requestFilter.finished = filter.status === 'success';
					}
					finishedExecutions = await makeRestApiRequest(
						context.rootGetters.getRestApiContext,
						'GET',
						'/executions',
						{
							filter: requestFilter,
						},
					);
				}
				return [...activeExecutions, ...finishedExecutions.results || []];
			} catch (error) {
				throw(error);
			}
		},
	},
	mutations: {
		setCurrentWorkflowExecutions (state: IWorkflowsState, executions: IExecutionsSummary[]) {
			state.currentWorkflowExecutions = executions;
		},
		setActiveWorkflowExecution (state: IWorkflowsState, executionData: IExecutionsSummary) {
			state.activeWorkflowExecution = executionData;
		},
	},
	getters: {
		currentWorkflowExecutions: (state: IWorkflowsState): IExecutionsSummary[] => {
			return state.currentWorkflowExecutions;
		},
		getActiveWorkflowExecution: (state: IWorkflowsState): IExecutionsSummary|null => {
			return state.activeWorkflowExecution;
		},
		getExecutionDataById: (state: IWorkflowsState) => (id: string) => {
			return state.currentWorkflowExecutions.find(execution => execution.id === id);
		},
	},
};

export default module;
