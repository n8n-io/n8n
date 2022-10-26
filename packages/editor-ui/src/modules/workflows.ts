import { makeRestApiRequest } from '@/api/helpers';
import { getCurrentExecutions, getFinishedExecutions, getNewWorkflow } from '@/api/workflows';
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
		finishedExecutionsCount: 0,
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
					activeExecutions = await getCurrentExecutions(context.rootGetters.getRestApiContext, requestFilter);
				}
				if (filter.status === '' || filter.finished) {
					if (filter.status === 'waiting') {
						requestFilter.waitTill = true;
					} else if (filter.status !== '')  {
						requestFilter.finished = filter.status === 'success';
					}
					finishedExecutions = await getFinishedExecutions(context.rootGetters.getRestApiContext, requestFilter);
				}
				context.commit('setTotalFinishedExecutionsCount', finishedExecutions.count);
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
		setTotalFinishedExecutionsCount (state: IWorkflowsState, count: number) {
			state.finishedExecutionsCount = count;
		},
		deleteExecution (state: IWorkflowsState, execution: IExecutionsSummary) {
			state.currentWorkflowExecutions.splice(state.currentWorkflowExecutions.indexOf(execution), 1);
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
		getTotalFinishedExecutionsCount: (state: IWorkflowsState) : number => {
			return state.finishedExecutionsCount;
		},
		getAllLoadedFinishedExecutions: (state: IWorkflowsState) : IExecutionsSummary[] => {
			return state.currentWorkflowExecutions.filter(ex => ex.finished === true || ex.stoppedAt !== undefined);
		},
	},
};

export default module;
