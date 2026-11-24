<script setup lang="ts">
import { N8nIconButton, N8nInput, N8nTag } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

const props = withDefaults(
	defineProps<{
		modelValue: string[];
		placeholder?: string;
		disabled?: boolean;
		/** Input data-testid; tags append `-tag`, the remove button `-tag-remove`. */
		testId: string;
	}>(),
	{
		placeholder: undefined,
		disabled: false,
	},
);

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();

const i18n = useI18n();
const draft = ref('');

function add() {
	const value = draft.value.trim();
	if (!value || props.modelValue.includes(value)) return;
	emit('update:modelValue', [...props.modelValue, value]);
	draft.value = '';
}

function remove(value: string) {
	emit(
		'update:modelValue',
		props.modelValue.filter((entry) => entry !== value),
	);
}

function removeLabel(value: string) {
	return i18n.baseText('agents.builder.guardrails.tagInput.remove', {
		interpolate: { value },
	});
}
</script>

<template>
	<div :class="$style.wrap" :inert="disabled || undefined">
		<N8nInput
			:model-value="draft"
			:placeholder="placeholder"
			:disabled="disabled"
			:data-testid="testId"
			@update:model-value="draft = $event"
			@keydown.enter.prevent="add"
		/>
		<div v-if="modelValue.length" :class="$style.tags">
			<N8nTag
				v-for="value in modelValue"
				:key="value"
				:text="value"
				:clickable="false"
				:class="$style.tag"
				:data-testid="`${testId}-tag`"
			>
				<template #tag>
					<span :class="$style.tagText" :title="value">{{ value }}</span>
					<N8nIconButton
						icon="x"
						variant="ghost"
						size="xsmall"
						:aria-label="removeLabel(value)"
						:disabled="disabled"
						:data-testid="`${testId}-tag-remove`"
						@click="remove(value)"
					/>
				</template>
			</N8nTag>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrap {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

/* Space the remove button from the tag text. */
.tag {
	gap: var(--spacing--3xs);
}

/* Mirrors the line-height reset of N8nTag's own .text span. The tag root sets
   line-height: 0, so without the reset the overflow: hidden clips the text. */
.tagText {
	min-width: 0;
	line-height: normal;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
