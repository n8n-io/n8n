<script lang="ts" setup>
import { N8nResizeWrapper } from '@n8n/design-system';

import InstanceAiThreadList from './InstanceAiThreadList.vue';
import { type AppThreadScope, useSidebarState } from '../instanceAiLayout';

/** The collapsible, resizable thread sidebar of a chat layout; state comes from `provideSidebarState()`. */
defineProps<{ appScope?: AppThreadScope }>();

const emit = defineEmits<{ resize: [size: { width: number }] }>();

const sidebar = useSidebarState();
</script>

<template>
	<Transition name="sidebar-slide">
		<N8nResizeWrapper
			v-if="!sidebar.collapsed.value"
			:class="$style.sidebar"
			:width="sidebar.width?.value"
			:style="{ width: `${sidebar.width?.value}px` }"
			:supported-directions="['right']"
			:is-resizing-enabled="true"
			:min-width="200"
			:max-width="400"
			@resize="emit('resize', $event)"
		>
			<InstanceAiThreadList :app-scope="appScope" @collapse="sidebar.toggle" />
		</N8nResizeWrapper>
	</Transition>
</template>

<style lang="scss" module>
.sidebar {
	min-width: 200px;
	max-width: 400px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	border-right: var(--border);
}
</style>

<style lang="scss">
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
	transition:
		width 0.2s cubic-bezier(0.16, 1, 0.3, 1),
		min-width 0.2s cubic-bezier(0.16, 1, 0.3, 1),
		opacity 0.2s ease;
	overflow: hidden;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
	width: 0 !important;
	min-width: 0 !important;
	opacity: 0;
}
</style>
