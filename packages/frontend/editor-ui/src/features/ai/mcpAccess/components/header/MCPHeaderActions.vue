<script setup lang="ts">
import MCPAccessToggle from '@/features/ai/mcpAccess/components/header/McpAccessToggle.vue';
import McpConnectPopover from '@/features/ai/mcpAccess/components/header/connectPopover/McpConnectPopover.vue';

type Props = {
	toggleDisabled?: boolean;
	loading?: boolean;
	accessEnabled: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	toggleDisabled: false,
	loading: false,
});

const emit = defineEmits<{
	disableMcpAccess: [];
}>();
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-header-actions">
		<MCPAccessToggle
			:model-value="accessEnabled"
			:disabled="props.toggleDisabled"
			:loading="props.loading"
			:class="$style['mcp-access-toggle']"
			@disable-mcp-access="emit('disableMcpAccess')"
		/>
		<McpConnectPopover :disabled="!accessEnabled" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	gap: var(--spacing--md);
	align-items: baseline;
	padding-top: var(--spacing--5xs);

	// Docs link doesn't have outline when not hovered
	// so we pull it closer to the rest of the elements
	// to make horizontal alignment visually balanced
	a {
		font-size: var(--font-size--2xs);
		margin-right: calc(-1 * var(--spacing--2xs));
	}
}
</style>
