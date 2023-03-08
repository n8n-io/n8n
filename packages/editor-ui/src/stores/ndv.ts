import { LOCAL_STORAGE_MAPPING_IS_ONBOARDED, STORES } from '@/constants';
import { INodeUi, IRunDataDisplayMode, NDVState, NodePanelType, XYPosition } from '@/Interface';
import { IRunData } from 'n8n-workflow';
import { defineStore } from 'pinia';
import Vue from 'vue';
import { useWorkflowsStore } from './workflows';

export const useNDVStore = defineStore(STORES.NDV, {
	state: (): NDVState => ({
		activeNodeName: null,
		mainPanelDimensions: {},
		sessionId: '',
		input: {
			displayMode: 'schema',
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
		isMappingOnboarded: window.localStorage.getItem(LOCAL_STORAGE_MAPPING_IS_ONBOARDED) === 'true',
	}),
	getters: {
		activeNode(): INodeUi | null {
			const workflowsStore = useWorkflowsStore();
			return workflowsStore.getNodeByName(this.activeNodeName || '');
		},
		ndvInputData(): IRunData[] {
			const workflowsStore = useWorkflowsStore();
			const executionData = workflowsStore.getWorkflowExecution;
			const inputNodeName: string | undefined = this.input.nodeName;
			const inputRunIndex: number = this.input.run ?? 0;
			const inputBranchIndex: number = this.input.branch ?? 0;

			if (
				!executionData ||
				!inputNodeName ||
				inputRunIndex === undefined ||
				inputBranchIndex === undefined
			) {
				return [];
			}

			return executionData.data?.resultData?.runData?.[inputNodeName]?.[inputRunIndex]?.data
				?.main?.[inputBranchIndex];
		},
		getPanelDisplayMode() {
			return (panel: NodePanelType) => this[panel].displayMode;
		},
		inputPanelDisplayMode(): IRunDataDisplayMode {
			return this.input.displayMode;
		},
		outputPanelDisplayMode(): IRunDataDisplayMode {
			return this.output.displayMode;
		},
		isDraggableDragging(): boolean {
			return this.draggable.isDragging;
		},
		draggableType(): string {
			return this.draggable.type;
		},
		draggableData(): string {
			return this.draggable.data;
		},
		canDraggableDrop(): boolean {
			return this.draggable.canDrop;
		},
		outputPanelEditMode(): NDVState['output']['editMode'] {
			return this.output.editMode;
		},
		getMainPanelDimensions() {
			return (panelType: string) => {
				const defaults = { relativeRight: 1, relativeLeft: 1, relativeWidth: 1 };
				return { ...defaults, ...this.mainPanelDimensions[panelType] };
			};
		},
		draggableStickyPos(): XYPosition | null {
			return this.draggable.stickyPosition;
		},
		ndvInputNodeName(): string | undefined {
			return this.input.nodeName;
		},
		ndvInputRunIndex(): number | undefined {
			return this.input.run;
		},
		ndvInputBranchIndex(): number | undefined {
			return this.input.branch;
		},
		isDNVDataEmpty() {
			return (panel: 'input' | 'output'): boolean => this[panel].data.isEmpty;
		},
	},
	actions: {
		setInputNodeName(name: string | undefined): void {
			Vue.set(this.input, 'nodeName', name);
		},
		setInputRunIndex(run?: string): void {
			Vue.set(this.input, 'run', run);
		},
		setMainPanelDimensions(params: {
			panelType: string;
			dimensions: { relativeLeft?: number; relativeRight?: number; relativeWidth?: number };
		}): void {
			Vue.set(this.mainPanelDimensions, params.panelType, {
				...this.mainPanelDimensions[params.panelType],
				...params.dimensions,
			});
		},
		setNDVSessionId(): void {
			Vue.set(this, 'sessionId', `ndv-${Math.random().toString(36).slice(-8)}`);
		},
		resetNDVSessionId(): void {
			Vue.set(this, 'sessionId', '');
		},
		setPanelDisplayMode(params: { pane: NodePanelType; mode: IRunDataDisplayMode }): void {
			Vue.set(this[params.pane], 'displayMode', params.mode);
		},
		setOutputPanelEditModeEnabled(isEnabled: boolean): void {
			Vue.set(this.output.editMode, 'enabled', isEnabled);
		},
		setOutputPanelEditModeValue(payload: string): void {
			Vue.set(this.output.editMode, 'value', payload);
		},
		setMappableNDVInputFocus(paramName: string): void {
			Vue.set(this, 'focusedMappableInput', paramName);
		},
		draggableStartDragging({ type, data }: { type: string; data: string }): void {
			this.draggable = {
				isDragging: true,
				type,
				data,
				canDrop: false,
				stickyPosition: null,
			};
		},
		draggableStopDragging(): void {
			this.draggable = {
				isDragging: false,
				type: '',
				data: '',
				canDrop: false,
				stickyPosition: null,
			};
		},
		setDraggableStickyPos(position: XYPosition | null): void {
			Vue.set(this.draggable, 'stickyPosition', position);
		},
		setDraggableCanDrop(canDrop: boolean): void {
			Vue.set(this.draggable, 'canDrop', canDrop);
		},
		setMappingTelemetry(telemetry: { [key: string]: string | number | boolean }): void {
			this.mappingTelemetry = { ...this.mappingTelemetry, ...telemetry };
		},
		resetMappingTelemetry(): void {
			this.mappingTelemetry = {};
		},
		setHoveringItem(item: null | NDVState['hoveringItem']): void {
			Vue.set(this, 'hoveringItem', item);
		},
		setNDVBranchIndex(e: { pane: 'input' | 'output'; branchIndex: number }): void {
			Vue.set(this[e.pane], 'branch', e.branchIndex);
		},
		setNDVPanelDataIsEmpty(payload: { panel: 'input' | 'output'; isEmpty: boolean }): void {
			Vue.set(this[payload.panel].data, 'isEmpty', payload.isEmpty);
		},
		disableMappingHint(store = true) {
			this.isMappingOnboarded = true;
			if (store) {
				window.localStorage.setItem(LOCAL_STORAGE_MAPPING_IS_ONBOARDED, 'true');
			}
		},
	},
});
