import { describe, it, expect } from 'vitest';
import { shallowReactive, type ComputedRef } from 'vue';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import { useWorkflowDocumentRenderData } from './useWorkflowDocumentRenderData';

describe('useWorkflowDocumentRenderData', () => {
	it('exposes the injected port maps under render', () => {
		const nodeInputsByNodeId = shallowReactive(
			new Map<string, ComputedRef<CanvasConnectionPort[]>>(),
		);
		const nodeOutputsByNodeId = shallowReactive(
			new Map<string, ComputedRef<CanvasConnectionPort[]>>(),
		);

		const { render } = useWorkflowDocumentRenderData({
			nodeInputsByNodeId,
			nodeOutputsByNodeId,
		});

		// The façade exposes the same map references — no copies, no wrapping.
		// Mutations to the underlying maps (done by useWorkflowDocumentNodes)
		// are observable through `render` because they share identity.
		expect(render.nodeInputsByNodeId).toBe(nodeInputsByNodeId);
		expect(render.nodeOutputsByNodeId).toBe(nodeOutputsByNodeId);
	});
});
