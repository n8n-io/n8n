import { ref } from 'vue';
import { NodeConnectionType } from 'n8n-workflow';
import { useNodeConnections } from '@/composables/useNodeConnections';
import type { CanvasNodeData } from '@/types';
import { CanvasConnectionMode } from '@/types';
import { createCanvasConnectionHandleString } from '@/utils/canvasUtilsV2';

describe('useNodeConnections', () => {
	const defaultConnections = {
		[CanvasConnectionMode.Input]: {},
		[CanvasConnectionMode.Output]: {},
	};
	describe('mainInputs', () => {
		it('should return main inputs when provided with main inputs', () => {
			const inputs = ref<CanvasNodeData['inputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.Main, index: 1 },
				{ type: NodeConnectionType.Main, index: 2 },
				{ type: NodeConnectionType.AiAgent, index: 0 },
			]);
			const outputs = ref<CanvasNodeData['outputs']>([]);

			const { mainInputs } = useNodeConnections({
				inputs,
				outputs,
				connections: defaultConnections,
			});

			expect(mainInputs.value.length).toBe(3);
			expect(mainInputs.value).toEqual(inputs.value.slice(0, 3));
		});
	});

	describe('nonMainInputs', () => {
		it('should return non-main inputs when provided with non-main inputs', () => {
			const inputs = ref<CanvasNodeData['inputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.AiAgent, index: 0 },
				{ type: NodeConnectionType.AiAgent, index: 1 },
			]);
			const outputs = ref<CanvasNodeData['outputs']>([]);

			const { nonMainInputs } = useNodeConnections({
				inputs,
				outputs,
				connections: defaultConnections,
			});

			expect(nonMainInputs.value.length).toBe(2);
			expect(nonMainInputs.value).toEqual(inputs.value.slice(1));
		});
	});

	describe('requiredNonMainInputs', () => {
		it('should return required non-main inputs when provided with required non-main inputs', () => {
			const inputs = ref<CanvasNodeData['inputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.AiAgent, required: true, index: 0 },
				{ type: NodeConnectionType.AiAgent, required: false, index: 1 },
			]);
			const outputs = ref<CanvasNodeData['outputs']>([]);

			const { requiredNonMainInputs } = useNodeConnections({
				inputs,
				outputs,
				connections: defaultConnections,
			});

			expect(requiredNonMainInputs.value.length).toBe(1);
			expect(requiredNonMainInputs.value).toEqual([inputs.value[1]]);
		});
	});

	describe('mainInputConnections', () => {
		it('should return main input connections when provided with main input connections', () => {
			const inputs = ref<CanvasNodeData['inputs']>([]);
			const outputs = ref<CanvasNodeData['outputs']>([]);
			const connections = ref<CanvasNodeData['connections']>({
				[CanvasConnectionMode.Input]: {
					[NodeConnectionType.Main]: [
						[{ node: 'node1', type: NodeConnectionType.Main, index: 0 }],
						[{ node: 'node2', type: NodeConnectionType.Main, index: 0 }],
					],
				},
				[CanvasConnectionMode.Output]: {},
			});

			const { mainInputConnections } = useNodeConnections({
				inputs,
				outputs,
				connections,
			});

			expect(mainInputConnections.value.length).toBe(2);
			expect(mainInputConnections.value).toEqual(
				connections.value[CanvasConnectionMode.Input][NodeConnectionType.Main],
			);
		});
	});

	describe('mainOutputs', () => {
		it('should return main outputs when provided with main outputs', () => {
			const inputs = ref<CanvasNodeData['inputs']>([]);
			const outputs = ref<CanvasNodeData['outputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.Main, index: 1 },
				{ type: NodeConnectionType.Main, index: 2 },
				{ type: NodeConnectionType.AiAgent, index: 0 },
			]);

			const { mainOutputs } = useNodeConnections({
				inputs,
				outputs,
				connections: defaultConnections,
			});

			expect(mainOutputs.value.length).toBe(3);
			expect(mainOutputs.value).toEqual(outputs.value.slice(0, 3));
		});
	});

	describe('nonMainOutputs', () => {
		it('should return non-main outputs when provided with non-main outputs', () => {
			const inputs = ref<CanvasNodeData['inputs']>([]);
			const outputs = ref<CanvasNodeData['outputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.AiAgent, index: 0 },
				{ type: NodeConnectionType.AiAgent, index: 1 },
			]);

			const { nonMainOutputs } = useNodeConnections({
				inputs,
				outputs,
				connections: defaultConnections,
			});

			expect(nonMainOutputs.value.length).toBe(2);
			expect(nonMainOutputs.value).toEqual(outputs.value.slice(1));
		});
	});

	describe('mainOutputConnections', () => {
		it('should return main output connections when provided with main output connections', () => {
			const inputs = ref<CanvasNodeData['inputs']>([]);
			const outputs = ref<CanvasNodeData['outputs']>([]);
			const connections = ref<CanvasNodeData['connections']>({
				[CanvasConnectionMode.Input]: {},
				[CanvasConnectionMode.Output]: {
					[NodeConnectionType.Main]: [
						[{ node: 'node1', type: NodeConnectionType.Main, index: 0 }],
						[{ node: 'node2', type: NodeConnectionType.Main, index: 0 }],
					],
				},
			});

			const { mainOutputConnections } = useNodeConnections({
				inputs,
				outputs,
				connections,
			});

			expect(mainOutputConnections.value.length).toBe(2);
			expect(mainOutputConnections.value).toEqual(
				connections.value[CanvasConnectionMode.Output][NodeConnectionType.Main],
			);
		});
	});

	describe('isValidConnection', () => {
		const inputs = ref<CanvasNodeData['inputs']>([]);
		const outputs = ref<CanvasNodeData['outputs']>([]);

		const { isValidConnection } = useNodeConnections({
			inputs,
			outputs,
			connections: defaultConnections,
		});

		it('returns true if source and target nodes are the same', () => {
			const connection = {
				source: 'node1',
				target: 'node1',
				sourceHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Output,
					type: NodeConnectionType.Main,
					index: 0,
				}),
				targetHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Input,
					type: NodeConnectionType.Main,
					index: 0,
				}),
			};
			expect(isValidConnection(connection)).toBe(true);
		});

		it('returns false if source and target handles are of the same mode', () => {
			const connection = {
				source: 'node1',
				target: 'node2',
				sourceHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Output,
					type: NodeConnectionType.Main,
					index: 0,
				}),
				targetHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Output,
					type: NodeConnectionType.Main,
					index: 0,
				}),
			};
			expect(isValidConnection(connection)).toBe(false);
		});

		it('returns false if source and target handles are of different types', () => {
			const connection = {
				source: 'node1',
				target: 'node2',
				sourceHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Output,
					type: NodeConnectionType.Main,
					index: 0,
				}),
				targetHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Input,
					type: NodeConnectionType.AiMemory,
					index: 0,
				}),
			};
			expect(isValidConnection(connection)).toBe(false);
		});

		it('returns true if source and target nodes are different, modes are different, and types are the same', () => {
			const connection = {
				source: 'node1',
				target: 'node2',
				sourceHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Output,
					type: NodeConnectionType.Main,
					index: 0,
				}),
				targetHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Input,
					type: NodeConnectionType.Main,
					index: 0,
				}),
			};
			expect(isValidConnection(connection)).toBe(true);
		});
	});
});
