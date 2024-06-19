import { ref } from 'vue';
import { NodeConnectionType } from 'n8n-workflow';
import { useNodeConnections } from '@/composables/useNodeConnections';
import type { CanvasElementData } from '@/types';

describe('useNodeConnections', () => {
	describe('mainInputs', () => {
		it('should return main inputs when provided with main inputs', () => {
			const inputs = ref<CanvasElementData['inputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.Main, index: 1 },
				{ type: NodeConnectionType.Main, index: 2 },
				{ type: NodeConnectionType.AiAgent, index: 0 },
			]);
			const outputs = ref<CanvasElementData['outputs']>([]);

			const { mainInputs } = useNodeConnections({ inputs, outputs });

			expect(mainInputs.value.length).toBe(3);
			expect(mainInputs.value).toEqual(inputs.value.slice(0, 3));
		});
	});

	describe('nonMainInputs', () => {
		it('should return non-main inputs when provided with non-main inputs', () => {
			const inputs = ref<CanvasElementData['inputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.AiAgent, index: 0 },
				{ type: NodeConnectionType.AiAgent, index: 1 },
			]);
			const outputs = ref<CanvasElementData['outputs']>([]);

			const { nonMainInputs } = useNodeConnections({ inputs, outputs });

			expect(nonMainInputs.value.length).toBe(2);
			expect(nonMainInputs.value).toEqual(inputs.value.slice(1));
		});
	});

	describe('requiredNonMainInputs', () => {
		it('should return required non-main inputs when provided with required non-main inputs', () => {
			const inputs = ref<CanvasElementData['inputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.AiAgent, required: true, index: 0 },
				{ type: NodeConnectionType.AiAgent, required: false, index: 1 },
			]);
			const outputs = ref<CanvasElementData['outputs']>([]);

			const { requiredNonMainInputs } = useNodeConnections({ inputs, outputs });

			expect(requiredNonMainInputs.value.length).toBe(1);
			expect(requiredNonMainInputs.value).toEqual([inputs.value[1]]);
		});
	});

	describe('mainOutputs', () => {
		it('should return main outputs when provided with main outputs', () => {
			const inputs = ref<CanvasElementData['inputs']>([]);
			const outputs = ref<CanvasElementData['outputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.Main, index: 1 },
				{ type: NodeConnectionType.Main, index: 2 },
				{ type: NodeConnectionType.AiAgent, index: 0 },
			]);

			const { mainOutputs } = useNodeConnections({ inputs, outputs });

			expect(mainOutputs.value.length).toBe(3);
			expect(mainOutputs.value).toEqual(outputs.value.slice(0, 3));
		});
	});

	describe('nonMainOutputs', () => {
		it('should return non-main outputs when provided with non-main outputs', () => {
			const inputs = ref<CanvasElementData['inputs']>([]);
			const outputs = ref<CanvasElementData['outputs']>([
				{ type: NodeConnectionType.Main, index: 0 },
				{ type: NodeConnectionType.AiAgent, index: 0 },
				{ type: NodeConnectionType.AiAgent, index: 1 },
			]);

			const { nonMainOutputs } = useNodeConnections({ inputs, outputs });

			expect(nonMainOutputs.value.length).toBe(2);
			expect(nonMainOutputs.value).toEqual(outputs.value.slice(1));
		});
	});
});
