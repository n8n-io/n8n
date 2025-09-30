<script setup lang="ts">
import { computed } from 'vue';
import { extensionPointRegistry } from '@/plugins/extension-points/registry';

interface Props {
	name: string;
	context?: Record<string, unknown>;
}

const props = defineProps<Props>();

const extensions = computed(() => {
	return extensionPointRegistry.get(props.name);
});

const hasExtensions = computed(() => extensions.value.length > 0);
</script>

<template>
	<!-- Render plugin extensions if available -->
	<div v-if="hasExtensions" :class="$style.extensionPoint" :data-extension-point="name">
		<component
			:is="extension.component"
			v-for="(extension, index) in extensions"
			:key="`${extension.pluginName}-${index}`"
			v-bind="context"
			:data-plugin="extension.pluginName"
		>
			<!-- Pass default slot content to plugin component -->
			<slot />
		</component>
	</div>

	<!-- Fallback to default slot if no extensions -->
	<slot v-else />
</template>

<style module>
.extensionPoint {
	/* Don't add extra DOM nesting */
	display: contents;
}
</style>
