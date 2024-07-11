import { CanvasNodeKey } from '@/constants';
import { ref } from 'vue';
import type { CanvasNode, CanvasNodeData } from '@/types';
import { CanvasNodeRenderType } from '@/types';

export function createCanvasNodeData({
	id = 'node',
	type = 'test',
	typeVersion = 1,
	disabled = false,
	inputs = [],
	outputs = [],
	connections = { input: {}, output: {} },
	execution = { running: false },
	issues = { items: [], visible: false },
	pinnedData = { count: 0, visible: false },
	runData = { count: 0, visible: false },
	render = {
		type: CanvasNodeRenderType.Default,
		options: { configurable: false, configuration: false, trigger: false },
	},
}: Partial<CanvasNodeData> = {}): CanvasNodeData {
	return {
		execution,
		issues,
		pinnedData,
		runData,
		id,
		type,
		typeVersion,
		disabled,
		inputs,
		outputs,
		connections,
		render,
	};
}

export function createCanvasNodeElement({
	id = '1',
	type = 'node',
	label = 'Node',
	position = { x: 100, y: 100 },
	data,
}: Partial<Omit<CanvasNode, 'data'> & { data: Partial<CanvasNodeData> }> = {}): CanvasNode {
	return {
		id,
		type,
		label,
		position,
		data: createCanvasNodeData({ id, type, ...data }),
	};
}

export function createCanvasNodeProps({
	id = 'node',
	label = 'Test Node',
	selected = false,
	data = {},
}: { id?: string; label?: string; selected?: boolean; data?: Partial<CanvasNodeData> } = {}) {
	return {
		id,
		label,
		selected,
		data: createCanvasNodeData(data),
	};
}

export function createCanvasNodeProvide({
	id = 'node',
	label = 'Test Node',
	selected = false,
	data = {},
}: { id?: string; label?: string; selected?: boolean; data?: Partial<CanvasNodeData> } = {}) {
	const props = createCanvasNodeProps({ id, label, selected, data });
	return {
		[`${CanvasNodeKey}`]: {
			id: ref(props.id),
			label: ref(props.label),
			selected: ref(props.selected),
			data: ref(props.data),
		},
	};
}

export function createCanvasConnection(
	nodeA: CanvasNode,
	nodeB: CanvasNode,
	{ sourceIndex = 0, targetIndex = 0 } = {},
) {
	const nodeAOutput = nodeA.data?.outputs[sourceIndex];
	const nodeBInput = nodeA.data?.inputs[targetIndex];

	return {
		id: `${nodeA.id}-${nodeB.id}`,
		source: nodeA.id,
		target: nodeB.id,
		...(nodeAOutput ? { sourceHandle: `outputs/${nodeAOutput.type}/${nodeAOutput.index}` } : {}),
		...(nodeBInput ? { targetHandle: `inputs/${nodeBInput.type}/${nodeBInput.index}` } : {}),
	};
}
