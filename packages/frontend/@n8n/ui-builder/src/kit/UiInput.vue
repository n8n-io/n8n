<script setup lang="ts">
import { N8nInput } from '@n8n/design-system';

defineOptions({ name: 'UiInput' });

// `value` has no default: it is `unknown` (state holds anything), and Vue would
// demand a factory for that. The template coerces.
withDefaults(defineProps<{ value?: unknown; placeholder?: string }>(), {
	placeholder: '',
});

// Both directions are the one binding the author wrote: the renderer reads
// `value` out of the state path and routes this event back into the same place.
const emit = defineEmits<{ write: [value: string] }>();
</script>

<template>
	<N8nInput
		:model-value="String(value ?? '')"
		:placeholder="placeholder"
		@update:model-value="emit('write', $event)"
	/>
</template>
