import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import {
	IExecutionsState,
	IRootState,
	IExecutionsCurrentSummaryExtended,
	IExecutionsSummary,
	IExecutionsListResponse,
	IPushDataExecutionFinished,
	IExecutionDeleteFilter,
} from '@/Interface';
import {
	getCurrentExecutions,
	getPastExecutions,
	stopCurrentExecution,
	retryExecution,
	getExecution,
	deleteExecutions,
} from '@/api/executions';
import { range as _range, sortBy } from 'lodash';

const module: Module<IExecutionsState, IRootState> = {
	namespaced: true,
	state: {
		activeExecutions: [],
		finishedExecutions: [],
		finishedExecutionsObj: {},
		finishedExecutionsCount: 0,
		finishedExecutionsCountEstimated: false,
		stoppingExecutions: [],
		activeExecutionsObj: {},
	},
	mutations: {
		addActiveExecution(state, newActiveExecution: IExecutionsCurrentSummaryExtended) {
			// Check if the execution exists already
			const activeExecution = state.activeExecutionsObj[newActiveExecution.id];

			if (activeExecution !== undefined) {
				// Exists already so no need to add it again
				if (activeExecution.workflowName === undefined) {
					activeExecution.workflowName = newActiveExecution.workflowName;
				}
				return;
			}

			Vue.set(state.activeExecutionsObj, newActiveExecution.id, newActiveExecution);
		},
		finishActiveExecution(state, finishedActiveExecution: IPushDataExecutionFinished) {
			// Find the execution to set to finished
			const activeExecution = state.activeExecutionsObj[finishedActiveExecution.executionId];

			if (activeExecution === undefined) {
				// The execution could not be found
				return;
			}

			if (finishedActiveExecution.executionId !== undefined) {
				Vue.set(activeExecution, 'id', finishedActiveExecution.executionId);
			}

			Vue.set(activeExecution, 'finished', finishedActiveExecution.data.finished);
			Vue.set(activeExecution, 'stoppedAt', finishedActiveExecution.data.stoppedAt);
		},
		setActiveExecutions(state, newActiveExecutions: IExecutionsCurrentSummaryExtended[]) {
			Vue.set(state, 'activeExecutions', newActiveExecutions);
		},
		setActiveExecutionsObj(state, newActiveExecutions: IExecutionsCurrentSummaryExtended[]) {
			console.log("🚀 ~ file: executions.ts ~ line 68 ~ setActiveExecutionsObj ~ setActiveExecutionsObj", newActiveExecutions);
			Vue.set(state, 'activeExecutionsObj', {});
			for (const execution of newActiveExecutions) {
				Vue.set(state.activeExecutionsObj, execution.id, execution);
			}
		},
		setFinishedExecutions(
			state,
			{ finishedExecutions, finishedExecutionsCount, finishedExecutionsCountEstimated },
		) {
			console.log("🚀 ~ file: executions.ts ~ line 78 ~ finishedExecutions", finishedExecutions);
			for (const execution of finishedExecutions) {
				Vue.set(state.finishedExecutionsObj, execution.id, execution);
			}
			state.finishedExecutionsCount = finishedExecutionsCount;
			state.finishedExecutionsCountEstimated = finishedExecutionsCountEstimated;
		},
		addStoppingExecution(
			state,
			executionId: string,
		) {
			state.stoppingExecutions.push(executionId);
		},
		removeStoppingExecution(
			state,
			executionId: string,
		) {
			const index = state.stoppingExecutions.indexOf(executionId);
			state.stoppingExecutions.splice(index, 1);
		},
		removePastExecutions(
			state,
			executionIds: string[],
		) {
			for (const executionId of executionIds) {
				Vue.delete(state.finishedExecutionsObj, executionId);
			}
		},
	},
	getters: {
		getActiveExecutions: (state): IExecutionsCurrentSummaryExtended[] => {
			return state.activeExecutions;
		},
		finishedExecutions: (state): IExecutionsSummary[] => {
			return state.finishedExecutions;
		},
		finishedExecutionsObj: (state): {[executionId: string]: IExecutionsSummary} => {
			return state.finishedExecutionsObj;
		},
		sortedFinishedExecutions: (state): IExecutionsSummary[] => {
			return sortBy(Object.values(state.finishedExecutionsObj), (execution) => parseInt(execution.id, 10));
		},
		activeExecutionsObj: (state): {[executionId: string]: IExecutionsCurrentSummaryExtended} => {
			return state.activeExecutionsObj;
		},
		sortedActiveExecutions: (state): IExecutionsCurrentSummaryExtended[] => {
			return sortBy(Object.values(state.activeExecutionsObj), (execution) => parseInt(execution.id, 10));
		},
		finishedExecutionsCount: (state): number => {
			return state.finishedExecutionsCount;
		},
		finishedExecutionsCountEstimated: (state): boolean => {
			return state.finishedExecutionsCountEstimated;
		},
		stoppingExecutions: (state): string[] => {
			return state.stoppingExecutions;
		},
	},
	actions: {
		async loadActiveExecutions (
			context: ActionContext<IExecutionsState, IRootState>,
			{ filter, workflowNameGetter }: { filter: object, workflowNameGetter: Function },
		): Promise<void> {
			const activeExecutions = await getCurrentExecutions(context.rootGetters.getRestApiContext, filter);

			for (const activeExecution of activeExecutions) {
				if (activeExecution.workflowId !== undefined && activeExecution.workflowName === undefined) {
					activeExecution.workflowName = workflowNameGetter(activeExecution.workflowId);
				}
			}

			context.commit('setActiveExecutions', activeExecutions);
			context.commit('setActiveExecutionsObj', activeExecutions);
		},
		async loadAutoRefresh (
			context: ActionContext<IExecutionsState, IRootState>,
			{ filter, workflowNameGetter }: { filter: object, workflowNameGetter: Function },
		) : Promise<void> {
			// We cannot use firstId here as some executions finish out of order. Let's say
			// You have execution ids 500 to 505 running.
			// Suppose 504 finishes before 500, 501, 502 and 503.
			// iF you use firstId, filtering id >= 504 you won't
			// ever get ids 500, 501, 502 and 503 when they finish
			const pastExecutionsPromise: Promise<IExecutionsListResponse> = getPastExecutions(context.rootGetters.getRestApiContext, filter, 30);
			const currentExecutionsPromise: Promise<IExecutionsCurrentSummaryExtended[]> = getCurrentExecutions(context.rootGetters.getRestApiContext, {});

			const [ pastExecutions, currentExecution ] = await Promise.all([pastExecutionsPromise, currentExecutionsPromise]);

			for (const activeExecution of currentExecution) {
				if (activeExecution.workflowId !== undefined && activeExecution.workflowName === undefined) {
					activeExecution.workflowName = workflowNameGetter(activeExecution.workflowId);
				}
			}

			context.commit('setActiveExecutions', currentExecution);
			context.commit('setActiveExecutionsObj', currentExecution);

			let finishedExecutions = [...Object.values(context.getters.finishedExecutionsObj) as IExecutionsSummary[]];
			console.log("🚀 ~ file: executions.ts ~ line 174 ~ finishedExecutions", finishedExecutions);
			// execution IDs are typed as string, int conversion is necessary so we can order.
			const alreadyPresentExecutionIds = finishedExecutions.map((exec: IExecutionsSummary) => parseInt(exec.id, 10));

			let lastId = 0;
			const gaps = [] as number[];
			for(let i = pastExecutions.results.length - 1; i >= 0; i--) {
				const currentItem = pastExecutions.results[i];
				const currentId = parseInt(currentItem.id, 10);
				if (lastId !== 0 && isNaN(currentId) === false) {
					// We are doing this iteration to detect possible gaps.
					// The gaps are used to remove executions that finished
					// and were deleted from database but were displaying
					// in this list while running.
					if (currentId - lastId > 1) {
						// We have some gaps.
						const range = _range(lastId + 1, currentId);
						gaps.push(...range);
					}
				}
				lastId = parseInt(currentItem.id, 10) || 0;

				// Check new results from end to start
				// Add new items accordingly.
				const executionIndex = alreadyPresentExecutionIds.indexOf(currentId);
				if (executionIndex !== -1) {
					// Execution that we received is already present.

					if (finishedExecutions[executionIndex].finished === false && currentItem.finished === true) {
						// Concurrency stuff. This might happen if the execution finishes
						// prior to saving all information to database. Somewhat rare but
						// With auto refresh and several executions, it happens sometimes.
						// So we replace the execution data so it displays correctly.
						finishedExecutions[executionIndex] = currentItem;
					}

					continue;
				}

				// Find the correct position to place this newcomer
				let j;
				for (j = finishedExecutions.length - 1; j >= 0; j--) {
					if (currentId < parseInt(finishedExecutions[j].id, 10)) {
						finishedExecutions.splice(j + 1, 0, currentItem);
						break;
					}
				}
				if (j === -1) {
					finishedExecutions.unshift(currentItem);
				}
			}
			console.log("🚀 ~ file: executions.ts ~ line 230 ~ lastId", lastId);

			finishedExecutions = finishedExecutions
				.filter((execution: IExecutionsSummary) => !gaps.includes(parseInt(execution.id, 10)) && lastId >= parseInt(execution.id, 10));

			const finishedExecutionsCount = pastExecutions.count;
			const finishedExecutionsCountEstimated = pastExecutions.estimated;

			context.commit('setFinishedExecutions', {
				finishedExecutions,
				finishedExecutionsCount,
				finishedExecutionsCountEstimated,
			});
		},
		async loadFinishedExecutions(
			context: ActionContext<IExecutionsState, IRootState>,
			{ filter, limit }: { filter: object, limit: number },
		) {
			const { results, count, estimated } = await getPastExecutions(context.rootGetters.getRestApiContext, filter, limit);

			context.commit('setFinishedExecutions', {
				finishedExecutions: results,
				finishedExecutionsCount: count,
				finishedExecutionsCountEstimated: estimated,
			});
		},
		async loadMore(
			context: ActionContext<IExecutionsState, IRootState>,
			{ filter, limit },
		) {
			console.log('Load more');
			const sortedFinishedExecutions = context.getters.sortedFinishedExecutions;
			const lastId = sortedFinishedExecutions[sortedFinishedExecutions.length - 1].id;
			console.log("🚀 ~ file: executions.ts ~ line 255 ~ lastId", lastId);

			let data: IExecutionsListResponse;
			try {
				data = await getPastExecutions(context.rootGetters.getRestApiContext, filter, limit, lastId);
			} catch (error) {
				throw error;
			}

			data.results = data.results.map((execution) => ({ ...execution, mode: execution.mode }));

			const finishedExecutions = [...context.getters.finishedExecutions, ...data.results];
			const finishedExecutionsCount = data.count;
			const finishedExecutionsCountEstimated = data.estimated;

			context.commit('setFinishedExecutions', {
				finishedExecutions,
				finishedExecutionsCount,
				finishedExecutionsCountEstimated,
			});
		},
		async stopExecution(
			context: ActionContext<IExecutionsState, IRootState>,
			activeExecutionId: string,
		) {
			try {
				// Add it to the list of currently stopping executions that we
				// can show the user in the UI that it is in progress
				context.commit('addStoppingExecution', activeExecutionId);

				await stopCurrentExecution(context.rootGetters.getRestApiContext, activeExecutionId);

				// Remove it from the list of currently stopping executions
				context.commit('removeStoppingExecution', activeExecutionId);
			} catch (error) {
				throw error;
			}
		},
		retryExecution(
			context: ActionContext<IExecutionsState, IRootState>,
			{ executionId, loadWorkflow }: { executionId: string; loadWorkflow: boolean},
		) {
			return retryExecution(context.rootGetters.getRestApiContext, executionId, loadWorkflow);
		},
		getExecution(
			context: ActionContext<IExecutionsState, IRootState>,
			executionId: string,
		) {
			return getExecution(context.rootGetters.getRestApiContext, executionId);
		},
		async deleteExecutions(
			context: ActionContext<IExecutionsState, IRootState>,
			filter: IExecutionDeleteFilter,
		) {
			await deleteExecutions(context.rootGetters.getRestApiContext, filter);

			context.commit('removePastExecutions', filter.ids);
		},
	},
};

export default module;
