<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nInput, N8nPopover, N8nText } from '@n8n/design-system';

/**
 * Optional steer for generated sample data.
 *
 * The blank field is the fast path: opening and pressing Enter (or clicking
 * Generate) behaves exactly like generating with no hint at all, so nobody has
 * to compose a prompt to get data. The presets exist because a bare text box
 * gives no clue what a "scenario" means here — clicking one generates straight
 * away rather than only filling the field.
 */

const emit = defineEmits<{
	generate: [hint: string | undefined];
}>();

const props = defineProps<{
	isGenerating: boolean;
	disabled?: boolean;
}>();

const i18n = useI18n();

// Listed explicitly rather than built from a key suffix, so the i18n keys stay
// statically checkable.
const presets = computed(() => [
	{ key: 'error', label: i18n.baseText('ndv.output.generateSampleData.preset.error') },
	{ key: 'empty', label: i18n.baseText('ndv.output.generateSampleData.preset.empty') },
	{ key: 'large', label: i18n.baseText('ndv.output.generateSampleData.preset.large') },
	{ key: 'edgeCases', label: i18n.baseText('ndv.output.generateSampleData.preset.edgeCases') },
]);

const open = ref(false);
const hint = ref('');
const inputRef = ref<InstanceType<typeof N8nInput>>();

watch(open, async (isOpen) => {
	if (!isOpen) {
		hint.value = '';
		return;
	}

	await nextTick();
	inputRef.value?.focus();
});

function submit(value?: string) {
	if (props.isGenerating || props.disabled) return;

	const trimmed = (value ?? hint.value).trim();

	open.value = false;
	emit('generate', trimmed.length > 0 ? trimmed : undefined);
}
</script>

<template>
	<N8nPopover v-model:open="open" width="320px" align="start" :content-class="$style.content">
		<template #trigger>
			<slot name="trigger" />
		</template>

		<template #content>
			<div :class="$style.body">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('ndv.output.generateSampleData.popover.description') }}
				</N8nText>

				<div :class="$style.presets">
					<N8nButton
						v-for="preset in presets"
						:key="preset.key"
						variant="outline"
						size="mini"
						:label="preset.label"
						:disabled="props.disabled || props.isGenerating"
						:data-test-id="`ndv-sample-data-preset-${preset.key}`"
						@click="submit(preset.label)"
					/>
				</div>

				<N8nInput
					ref="inputRef"
					v-model="hint"
					size="small"
					:placeholder="i18n.baseText('ndv.output.generateSampleData.popover.placeholder')"
					:disabled="props.disabled || props.isGenerating"
					data-test-id="ndv-sample-data-hint"
					@keydown.enter.prevent="submit()"
				/>

				<N8nButton
					:class="$style.submit"
					variant="solid"
					size="small"
					:loading="props.isGenerating"
					:disabled="props.disabled"
					:label="i18n.baseText('ndv.output.generateSampleData.popover.submit')"
					data-test-id="ndv-sample-data-generate"
					@click="submit()"
				/>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.content {
	padding: var(--spacing--xs);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.presets {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.submit {
	align-self: flex-end;
}
</style>
