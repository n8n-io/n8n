import Vue from 'vue';
import { Module } from 'vuex';
import {
	IRootState,
	IRunDataDisplayMode,
	NDVState,
	XYPosition,
	IExecutionResponse,
	INodeUi,
} from '../Interface';

const module: Module<NDVState, IRootState> = {
	namespaced: true,
	state: {
		activeNodeName: null,
		mainPanelDimensions: {},
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
		draggable: {
			isDragging: false,
			type: '',
			data: '',
			canDrop: false,
			stickyPosition: null,
		},
	},
	getters: {
		activeNodeName: (state: NDVState) => state.activeNodeName,
		activeNode: (state, getters, rootState, rootGetters): INodeUi | null => {
			return rootGetters.getNodeByName(state.activeNodeName);
		},
		ndvInputData: (state: NDVState, getters, rootState: IRootState, rootGetters) => {
			const executionData = rootGetters.getWorkflowExecution as IExecutionResponse | null;
			const inputNodeName: string | undefined = state.input.nodeName;
			const inputRunIndex: number = state.input.run ?? 0;
			const inputBranchIndex: number = state.input.branch?? 0;

			if (!executionData || !inputNodeName || inputRunIndex === undefined || inputBranchIndex === undefined) {
				return [];
			}

			return executionData.data?.resultData?.runData?.[inputNodeName]?.[inputRunIndex]?.data?.main?.[inputBranchIndex];
		},
		ndvSessionId: (state: NDVState): string => state.sessionId,
		getPanelDisplayMode: (state: NDVState)  => {
			return (panel: 'input' | 'output') => state[panel].displayMode;
		},
		inputPanelDisplayMode: (state: NDVState) => state.input.displayMode,
		outputPanelDisplayMode: (state: NDVState) => state.output.displayMode,
		outputPanelEditMode: (state: NDVState): NDVState['output']['editMode'] => state.output.editMode,
		focusedMappableInput: (state: NDVState) => state.focusedMappableInput,
		isDraggableDragging: (state: NDVState) => state.draggable.isDragging,
		draggableType: (state: NDVState) => state.draggable.type,
		draggableData: (state: NDVState) => state.draggable.data,
		canDraggableDrop: (state: NDVState) => state.draggable.canDrop,
		mainPanelDimensions: (state: NDVState) => (panelType: string) => {
			const defaults = { relativeRight: 1, relativeLeft: 1, relativeWidth: 1 };

			return {...defaults, ...state.mainPanelDimensions[panelType]};
		},
		draggableStickyPos: (state: NDVState) => state.draggable.stickyPosition,
		mappingTelemetry: (state: NDVState) => state.mappingTelemetry,
		hoveringItem: (state: NDVState) => state.hoveringItem,
		ndvInputNodeName: (state: NDVState) => state.input.nodeName,
		ndvInputRunIndex: (state: NDVState) => state.input.run,
		ndvInputBranchIndex: (state: NDVState) => state.input.branch,
		getNDVDataIsEmpty: (state: NDVState) => (panel: 'input' | 'output'): boolean => state[panel].data.isEmpty,
	},
	mutations: {
		setActiveNodeName(state, nodeName: string) {
			state.activeNodeName = nodeName;
		},
		setInputNodeName: (state: NDVState, name: string | undefined) => {
			Vue.set(state.input, 'nodeName', name);
		},
		setInputRunIndex: (state: NDVState, run?: string) => {
			Vue.set(state.input, 'run', run);
		},
		setMainPanelDimensions: (state: NDVState, params: { panelType:string, dimensions: { relativeLeft?: number, relativeRight?: number, relativeWidth?: number }}) => {
			Vue.set(
				state.mainPanelDimensions,
				params.panelType,
				{...state.mainPanelDimensions[params.panelType], ...params.dimensions },
			);
		},
		setNDVSessionId: (state: NDVState) => {
			Vue.set(state, 'sessionId', `ndv-${Math.random().toString(36).slice(-8)}`);
		},
		resetNDVSessionId: (state: NDVState) => {
			Vue.set(state, 'sessionId', '');
		},
		setPanelDisplayMode: (state: NDVState, params: {pane: 'input' | 'output', mode: IRunDataDisplayMode}) => {
			Vue.set(state[params.pane], 'displayMode', params.mode);
		},
		setOutputPanelEditModeEnabled: (state: NDVState, payload: boolean) => {
			Vue.set(state.output.editMode, 'enabled', payload);
		},
		setOutputPanelEditModeValue: (state: NDVState, payload: string) => {
			Vue.set(state.output.editMode, 'value', payload);
		},
		setMappableNDVInputFocus(state: NDVState, paramName: string) {
			Vue.set(state, 'focusedMappableInput', paramName);
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
			state.mappingTelemetry = {...state.mappingTelemetry, ...telemetry};
		},
		resetMappingTelemetry(state: NDVState) {
			state.mappingTelemetry = {};
		},
		setHoveringItem(state: NDVState, item: null | NDVState['hoveringItem']) {
			Vue.set(state, 'hoveringItem', item);
		},
		setNDVBranchIndex(state: NDVState, e: {pane: 'input' | 'output', branchIndex: number}) {
			Vue.set(state[e.pane], 'branch', e.branchIndex);
		},
		setNDVPanelDataIsEmpty(state: NDVState, payload: {panel: 'input' | 'output', isEmpty: boolean}) {
			Vue.set(state[payload.panel].data, 'isEmpty', payload.isEmpty);
		},
	},
	actions: {
	},
};

export default module;
