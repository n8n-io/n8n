import Vue from 'vue';
import { Module } from 'vuex';
import {
	IRootState,
	IRunDataDisplayMode,
	NDVState,
	XYPosition,
	IExecutionResponse,
} from '../Interface';

const module: Module<NDVState, IRootState> = {
	namespaced: true,
	state: {
		mainPanelDimensions: {},
		ndv: {
			sessionId: '',
			input: {
				displayMode: 'table',
				nodeName: undefined,
				run: undefined,
				branch: undefined,
				data: {
					isEmpty: true,
				},
			},
			output: {
				displayMode: 'table',
				branch: undefined,
				data: {
					isEmpty: true,
				},
				editMode: {
					enabled: false,
					value: '',
				},
			},
			focusedMappableInput: '',
			mappingTelemetry: {},
			hoveringItem: null,
		},
		draggable: {
			isDragging: false,
			type: '',
			data: '',
			canDrop: false,
			stickyPosition: null,
		},
	},
	getters: {
		ndvInputData: (state: NDVState, getters, rootState: IRootState, rootGetters) => {
			const executionData = rootGetters.getWorkflowExecution as IExecutionResponse | null;
			const inputNodeName: string | undefined = state.ndv.input.nodeName;
			const inputRunIndex: number = state.ndv.input.run ?? 0;
			const inputBranchIndex: number = state.ndv.input.branch?? 0;

			if (!executionData || !inputNodeName || inputRunIndex === undefined || inputBranchIndex === undefined) {
				return [];
			}

			return executionData.data?.resultData?.runData?.[inputNodeName]?.[inputRunIndex]?.data?.main?.[inputBranchIndex];
		},
		ndvSessionId: (state: NDVState): string => state.ndv.sessionId,
		getPanelDisplayMode: (state: NDVState)  => {
			return (panel: 'input' | 'output') => state.ndv[panel].displayMode;
		},
		inputPanelDisplayMode: (state: NDVState) => state.ndv.input.displayMode,
		outputPanelDisplayMode: (state: NDVState) => state.ndv.output.displayMode,
		outputPanelEditMode: (state: NDVState): NDVState['ndv']['output']['editMode'] => state.ndv.output.editMode,
		focusedMappableInput: (state: NDVState) => state.ndv.focusedMappableInput,
		isDraggableDragging: (state: NDVState) => state.draggable.isDragging,
		draggableType: (state: NDVState) => state.draggable.type,
		draggableData: (state: NDVState) => state.draggable.data,
		canDraggableDrop: (state: NDVState) => state.draggable.canDrop,
		mainPanelDimensions: (state: NDVState) => (panelType: string) => {
			const defaults = { relativeRight: 1, relativeLeft: 1, relativeWidth: 1 };

			return {...defaults, ...state.mainPanelDimensions[panelType]};
		},
		draggableStickyPos: (state: NDVState) => state.draggable.stickyPosition,
		mappingTelemetry: (state: NDVState) => state.ndv.mappingTelemetry,
		hoveringItem: (state: NDVState) => state.ndv.hoveringItem,
		ndvInputNodeName: (state: NDVState) => state.ndv.input.nodeName,
		ndvInputRunIndex: (state: NDVState) => state.ndv.input.run,
		ndvInputBranchIndex: (state: NDVState) => state.ndv.input.branch,
		getNDVDataIsEmpty: (state: NDVState) => (panel: 'input' | 'output'): boolean => state.ndv[panel].data.isEmpty,
	},
	mutations: {
		setInputNodeName: (state: NDVState, name: string | undefined) => {
			Vue.set(state.ndv.input, 'nodeName', name);
		},
		setInputRunIndex: (state: NDVState, run?: string) => {
			Vue.set(state.ndv.input, 'run', run);
		},
		setMainPanelDimensions: (state: NDVState, params: { panelType:string, dimensions: { relativeLeft?: number, relativeRight?: number, relativeWidth?: number }}) => {
			Vue.set(
				state.mainPanelDimensions,
				params.panelType,
				{...state.mainPanelDimensions[params.panelType], ...params.dimensions },
			);
		},
		setNDVSessionId: (state: NDVState) => {
			Vue.set(state.ndv, 'sessionId', `ndv-${Math.random().toString(36).slice(-8)}`);
		},
		resetNDVSessionId: (state: NDVState) => {
			Vue.set(state.ndv, 'sessionId', '');
		},
		setPanelDisplayMode: (state: NDVState, params: {pane: 'input' | 'output', mode: IRunDataDisplayMode}) => {
			Vue.set(state.ndv[params.pane], 'displayMode', params.mode);
		},
		setOutputPanelEditModeEnabled: (state: NDVState, payload: boolean) => {
			Vue.set(state.ndv.output.editMode, 'enabled', payload);
		},
		setOutputPanelEditModeValue: (state: NDVState, payload: string) => {
			Vue.set(state.ndv.output.editMode, 'value', payload);
		},
		setMappableNDVInputFocus(state: NDVState, paramName: string) {
			Vue.set(state.ndv, 'focusedMappableInput', paramName);
		},
		draggableStartDragging(state: NDVState, {type, data}: {type: string, data: string}) {
			state.draggable = {
				isDragging: true,
				type,
				data,
				canDrop: false,
				stickyPosition: null,
			};
		},
		draggableStopDragging(state: NDVState) {
			state.draggable = {
				isDragging: false,
				type: '',
				data: '',
				canDrop: false,
				stickyPosition: null,
			};
		},
		setDraggableStickyPos(state: NDVState, position: XYPosition | null) {
			Vue.set(state.draggable, 'stickyPosition', position);
		},
		setDraggableCanDrop(state: NDVState, canDrop: boolean) {
			Vue.set(state.draggable, 'canDrop', canDrop);
		},
		setMappingTelemetry(state: NDVState, telemetry: {[key: string]: string | number | boolean}) {
			state.ndv.mappingTelemetry = {...state.ndv.mappingTelemetry, ...telemetry};
		},
		resetMappingTelemetry(state: NDVState) {
			state.ndv.mappingTelemetry = {};
		},
		setHoveringItem(state: NDVState, item: null | NDVState['ndv']['hoveringItem']) {
			Vue.set(state.ndv, 'hoveringItem', item);
		},
		setNDVBranchIndex(state: NDVState, e: {pane: 'input' | 'output', branchIndex: number}) {
			Vue.set(state.ndv[e.pane], 'branch', e.branchIndex);
		},
		setNDVPanelDataIsEmpty(state: NDVState, payload: {panel: 'input' | 'output', isEmpty: boolean}) {
			Vue.set(state.ndv[payload.panel].data, 'isEmpty', payload.isEmpty);
		},
	},
	actions: {
	},
};

export default module;
