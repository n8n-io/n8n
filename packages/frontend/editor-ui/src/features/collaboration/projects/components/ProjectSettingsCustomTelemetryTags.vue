<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';

type Tag = { key: string; value: string };

const props = defineProps<{
	modelValue: Tag[];
}>();

const emit = defineEmits<{
	'update:modelValue': [Tag[]];
	validate: [boolean];
}>();

const i18n = useI18n();

const tagTouched = ref<boolean[]>(props.modelValue.map(() => false));

// Trim tagTouched when parent resets to a shorter array
watch(
	() => props.modelValue.length,
	(len) => {
		if (len < tagTouched.value.length) {
			tagTouched.value = tagTouched.value.slice(0, len);
		}
	},
);

const tagErrors = computed(() => {
	const seen = new Set<string>();
	return props.modelValue.map((tag) => {
		const trimmed = tag.key.trim();
		if (!trimmed) return i18n.baseText('projects.settings.telemetryTags.error.emptyKey');
		if (seen.has(trimmed))
			return i18n.baseText('projects.settings.telemetryTags.error.duplicateKey');
		seen.add(trimmed);
		return null;
	});
});

const hasErrors = computed(() => tagErrors.value.some((e) => e !== null));

watch(hasErrors, (val) => emit('validate', !val), { immediate: true });

function resetTouched() {
	tagTouched.value = props.modelValue.map(() => false);
}

function onTagKeyBlur(index: number) {
	tagTouched.value[index] = true;
}

function addTag() {
	emit('update:modelValue', [...props.modelValue, { key: '', value: '' }]);
	tagTouched.value.push(false);
}

function removeTag(index: number) {
	emit(
		'update:modelValue',
		props.modelValue.filter((_, i) => i !== index),
	);
	tagTouched.value.splice(index, 1);
}

function onTagInput(index: number, field: 'key' | 'value', value: string) {
	emit(
		'update:modelValue',
		props.modelValue.map((tag, i) => (i === index ? { ...tag, [field]: value } : tag)),
	);
}

defineExpose({ resetTouched });
</script>

<template>
	<div>
		<N8nText size="small" class="mb-s" tag="p">
			{{ i18n.baseText('projects.settings.telemetryTags.description') }}
			<a
				:class="$style.docsLink"
				href="https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/"
				target="_blank"
				>{{ i18n.baseText('projects.settings.telemetryTags.docsLink')
				}}<N8nIcon icon="arrow-up-right" size="xsmall"
			/></a>
		</N8nText>
		<div v-for="(tag, index) in modelValue" :key="index" :class="$style.telemetryTagContainer">
			<div :class="$style.telemetryTagRow">
				<N8nInputLabel
					:label="
						index === 0 ? i18n.baseText('projects.settings.telemetryTags.key.label') : undefined
					"
					size="small"
				>
					<N8nInput
						:model-value="tag.key"
						:placeholder="i18n.baseText('projects.settings.telemetryTags.key.placeholder')"
						:aria-label="i18n.baseText('projects.settings.telemetryTags.key.label')"
						data-test-id="project-telemetry-tag-key"
						@update:model-value="(v: string) => onTagInput(index, 'key', v)"
						@blur="onTagKeyBlur(index)"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="
						index === 0 ? i18n.baseText('projects.settings.telemetryTags.value.label') : undefined
					"
					size="small"
				>
					<N8nInput
						:model-value="tag.value"
						:placeholder="i18n.baseText('projects.settings.telemetryTags.value.placeholder')"
						:aria-label="i18n.baseText('projects.settings.telemetryTags.value.label')"
						data-test-id="project-telemetry-tag-value"
						@update:model-value="(v: string) => onTagInput(index, 'value', v)"
					/>
				</N8nInputLabel>
				<N8nButton
					icon="trash-2"
					variant="ghost"
					size="small"
					native-type="button"
					:title="i18n.baseText('projects.settings.telemetryTags.remove')"
					:aria-label="i18n.baseText('projects.settings.telemetryTags.remove')"
					data-test-id="project-telemetry-tag-remove"
					@click.stop.prevent="removeTag(index)"
				/>
			</div>
			<span
				v-if="tagTouched[index] && tagErrors[index]"
				:class="$style.tagErrorMessage"
				data-test-id="project-telemetry-tag-key-error"
				>{{ tagErrors[index] }}</span
			>
		</div>
		<N8nButton
			icon="plus"
			variant="subtle"
			native-type="button"
			class="mt-2xs"
			data-test-id="project-telemetry-tag-add"
			@click.stop.prevent="addTag"
			>{{ i18n.baseText('projects.settings.telemetryTags.add') }}</N8nButton
		>
	</div>
</template>

<style lang="scss" module>
.telemetryTagContainer {
	margin-bottom: var(--spacing--2xs);
	max-width: var(--project-field--width);
}

.telemetryTagRow {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: flex-end;
}

.tagErrorMessage {
	font-size: var(--font-size--3xs);
	color: var(--color--danger);
	line-height: var(--line-height--sm);
	margin-top: var(--spacing--4xs);
}

.docsLink {
	text-decoration: underline;
	color: inherit;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);

	&:hover {
		color: var(--color--primary);
	}
}
</style>
