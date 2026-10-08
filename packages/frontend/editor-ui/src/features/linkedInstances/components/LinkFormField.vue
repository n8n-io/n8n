<script setup lang="ts">
import { N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
import { computed, useTemplateRef } from 'vue';

// The `data-test-id` and other attributes go to the input, not to the wrapper.
defineOptions({ inheritAttrs: false });

/**
 * One labelled text or password input with optional help text and an error line.
 * Browsers ignore autocomplete "off" on a password input. "new-password" stops them from
 * filling a saved sign-in password into the access token field.
 */
const props = withDefaults(
	defineProps<{
		id: string;
		label: string;
		type?: 'text' | 'password';
		placeholder?: string;
		help?: string;
		error?: string;
	}>(),
	{
		type: 'text',
		placeholder: '',
		help: undefined,
		error: undefined,
	},
);

const emit = defineEmits<{ blur: [] }>();

const model = defineModel<string>({ required: true });

const helpId = computed(() => `${props.id}-help`);
const errorId = computed(() => `${props.id}-error`);
const describedBy = computed(() => {
	const ids = [props.help ? helpId.value : '', props.error ? errorId.value : ''];
	return ids.filter((id) => id !== '').join(' ') || undefined;
});

const input = useTemplateRef<InstanceType<typeof N8nInput>>('input');

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
	<div :class="$style.field">
		<N8nInputLabel :input-name="id" :label="label" required>
			<N8nInput
				:id="id"
				ref="input"
				v-model="model"
				v-bind="$attrs"
				:type="type"
				:placeholder="placeholder"
				:autocomplete="type === 'password' ? 'new-password' : 'off'"
				required
				:aria-invalid="error ? 'true' : undefined"
				:aria-describedby="describedBy"
				@blur="emit('blur')"
			/>
		</N8nInputLabel>
		<N8nText v-if="help" :id="helpId" size="small" color="text-base">{{ help }}</N8nText>
		<N8nText v-if="error" :id="errorId" size="small" color="danger" :data-test-id="`${id}-error`">
			{{ error }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
