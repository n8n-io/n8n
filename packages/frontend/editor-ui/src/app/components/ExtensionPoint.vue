<script setup lang="ts">
import { computed } from 'vue';
import { extensionPointRegistry } from '@/app/plugins/extension-loader/registry';

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
	<div :class="$style.extensionPoint" :data-extension-point="name">
		<!-- Render extension components if available -->
		<template v-if="hasExtensions">
			<component
				:is="extension.component"
				v-for="(extension, index) in extensions"
				:key="`${extension.extensionName}-${index}`"
				v-bind="context"
				:data-extension="extension.extensionName"
			>
				<!-- Pass default slot content to extension component -->
				<slot />
			</component>
		</template>

		<!-- Fallback to default slot if no extensions -->
		<slot v-else />
	</div>
</template>

<style module>
.extensionPoint {
	/* Don't add extra DOM nesting */
	display: contents;
}
</style>
