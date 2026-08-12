<script setup lang="ts">
import { N8nInput } from '@n8n/design-system';

defineOptions({ name: 'UiInput' });

// `value` has no default: it is `unknown` (an expression can resolve to
// anything), and Vue would demand a factory for that. The template coerces.
withDefaults(defineProps<{ value?: unknown; placeholder?: string }>(), {
	placeholder: '',
});

// `value` is read from state through an expression; writes go back out through
// this event, which the renderer routes to the component's `model` path. The
// two directions are separate props by design, so nothing is inferred.
const emit = defineEmits<{ write: [value: string] }>();
</script>

<template>
	<N8nInput
		:model-value="String(value ?? '')"
		:placeholder="placeholder"
		@update:model-value="emit('write', $event)"
	/>
</template>
