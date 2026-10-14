<script lang="ts" setup>
import { h, inject } from 'vue';
// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { useMcpDiscovery } from '@/experiments/surfaceMcpToClaudeTrialUsers/useMcpDiscovery';
// EOF Experiment cleanup
import CanvasNodeDefault from './render-types/CanvasNodeDefault.vue';
import CanvasNodeStickyNote from './render-types/CanvasNodeStickyNote.vue';
import CanvasNodeAddNodes from './render-types/CanvasNodeAddNodes.vue';
import CanvasNodeChoicePrompt from './render-types/CanvasNodeChoicePrompt.vue';
import CanvasNodeAgent from './render-types/CanvasNodeAgent.vue';
import { CanvasNodeKey } from '@/app/constants';
import { CanvasNodeRenderType } from '../../../canvas.types';

// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
const { showMcpDiscovery } = useMcpDiscovery();
// EOF Experiment cleanup
const node = inject(CanvasNodeKey);

const Render = () => {
	const renderType = node?.data.value.render.type ?? CanvasNodeRenderType.Default;
	let Component;

	switch (renderType) {
		case CanvasNodeRenderType.StickyNote:
			Component = CanvasNodeStickyNote;
			break;
		case CanvasNodeRenderType.AddNodes:
			// Experiment cleanup (123_surface_mcp_to_claude_trial_users): restore Component = CanvasNodeAddNodes.
			Component = showMcpDiscovery.value ? CanvasNodeChoicePrompt : CanvasNodeAddNodes;
			break;
		case CanvasNodeRenderType.ChoicePrompt:
			Component = CanvasNodeChoicePrompt;
			break;
		case CanvasNodeRenderType.Agent:
			Component = CanvasNodeAgent;
			break;
		default:
			Component = CanvasNodeDefault;
	}

	return h(Component, {
		'data-canvas-node-render-type': renderType,
	});
};
</script>

<template>
	<Render />
</template>
