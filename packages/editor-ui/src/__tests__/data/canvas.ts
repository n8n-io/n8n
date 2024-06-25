import { CanvasNodeKey } from '@/constants';
import { ref } from 'vue';
import type { CanvasElement, CanvasElementData } from '@/types';

export function createCanvasNodeData({
	id = 'node',
	type = 'test',
	typeVersion = 1,
	inputs = [],
	outputs = [],
	renderType = 'default',
}: Partial<CanvasElementData> = {}): CanvasElementData {
	return {
		id,
		type,
		typeVersion,
		inputs,
		outputs,
		renderType,
	};
}

export function createCanvasNodeElement({
	id = '1',
	type = 'node',
	label = 'Node',
	position = { x: 100, y: 100 },
	data,
}: Partial<
	Omit<CanvasElement, 'data'> & { data: Partial<CanvasElementData> }
> = {}): CanvasElement {
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
} = {}) {
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
} = {}) {
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
	nodeA: CanvasElement,
	nodeB: CanvasElement,
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
