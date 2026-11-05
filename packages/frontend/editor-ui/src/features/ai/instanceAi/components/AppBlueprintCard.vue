<script setup lang="ts">
import {
	appNameSchema,
	appNamespaceSchema,
	type AppBlueprint,
	type InstanceAiConfirmRequest,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nTag,
	N8nText,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ToolIcon from '@/features/shared/toolsConnection/ToolIcon.vue';

type AppBlueprintBinding = NonNullable<AppBlueprint['bindings']>[number];

const props = defineProps<{
	blueprint: AppBlueprint;
	readOnly?: boolean;
}>();

const emit = defineEmits<{ submit: [body: InstanceAiConfirmRequest] }>();

const i18n = useI18n();
const name = ref(props.blueprint.name);
const namespace = ref(props.blueprint.namespace);
const visibility = ref(props.blueprint.visibility);
const theme = ref(props.blueprint.theme);
const additionalInstructions = ref(props.blueprint.additionalInstructions ?? '');

const bindingIcons: Record<AppBlueprintBinding['kind'], IconName> = {
	workflow: 'workflow',
	dataTable: 'table',
	agent: 'robot',
};

const visibilityOptions = ['project', 'instance'] as const;
const themeOptions = computed(() =>
	(['light', 'dark', 'both'] as const).map((value) => ({
		value,
		label: i18n.baseText(`instanceAi.appBlueprint.theme.${value}`),
	})),
);
const editedBlueprint = computed<AppBlueprint>(() => ({
	name: name.value.trim(),
	namespace: namespace.value.trim(),
	visibility: visibility.value,
	description: props.blueprint.description,
	theme: theme.value,
	...(props.blueprint.bindings ? { bindings: props.blueprint.bindings } : {}),
	...(additionalInstructions.value.trim()
		? { additionalInstructions: additionalInstructions.value.trim() }
		: {}),
}));
const isValid = computed(
	() =>
		appNameSchema.safeParse(editedBlueprint.value.name).success &&
		appNamespaceSchema.safeParse(editedBlueprint.value.namespace).success &&
		editedBlueprint.value.description.length > 0,
);

function startBuilding() {
	if (props.readOnly || !isValid.value) return;
	emit('submit', {
		kind: 'appBlueprint',
		approved: true,
		blueprint: editedBlueprint.value,
	});
}

function cancel() {
	if (props.readOnly) return;
	emit('submit', {
		kind: 'appBlueprint',
		approved: false,
		blueprint: props.blueprint,
	});
}
</script>

<template>
	<div
		:class="[$style.card, !readOnly && $style.awaitingInput]"
		data-test-id="instance-ai-app-blueprint"
	>
		<div :class="$style.content">
			<N8nText size="medium" color="text-dark" bold>
				{{ i18n.baseText('instanceAi.appBlueprint.title') }}
			</N8nText>
			<N8nText
				size="medium"
				color="text-base"
				:class="$style.description"
				data-test-id="instance-ai-app-blueprint-description"
			>
				{{ blueprint.description }}
			</N8nText>

			<div :class="$style.fields">
				<label :class="$style.field">
					<N8nText size="medium" color="text-dark">{{
						i18n.baseText('instanceAi.appBlueprint.name')
					}}</N8nText>
					<N8nInput
						v-model="name"
						size="medium"
						:disabled="readOnly"
						data-test-id="instance-ai-app-blueprint-name"
					/>
				</label>
				<label :class="$style.field">
					<N8nText size="medium" color="text-dark">{{
						i18n.baseText('instanceAi.appBlueprint.namespace')
					}}</N8nText>
					<N8nInput
						v-model="namespace"
						size="medium"
						:disabled="readOnly"
						data-test-id="instance-ai-app-blueprint-namespace"
					/>
				</label>
				<label :class="$style.field">
					<N8nText size="medium" color="text-dark">{{
						i18n.baseText('instanceAi.appBlueprint.visibility')
					}}</N8nText>
					<N8nSelect
						v-model="visibility"
						size="medium"
						:disabled="readOnly"
						data-test-id="instance-ai-app-blueprint-visibility"
					>
						<N8nOption
							v-for="option in visibilityOptions"
							:key="option"
							:value="option"
							:label="i18n.baseText(`instanceAi.appBlueprint.visibility.${option}`)"
						/>
					</N8nSelect>
				</label>
				<label :class="$style.field">
					<N8nText size="medium" color="text-dark">{{
						i18n.baseText('instanceAi.appBlueprint.theme')
					}}</N8nText>
					<N8nSelect
						v-model="theme"
						size="medium"
						:disabled="readOnly"
						data-test-id="instance-ai-app-blueprint-theme"
					>
						<N8nOption
							v-for="option in themeOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</label>
			</div>

			<div v-if="blueprint.bindings?.length" :class="$style.bindings">
				<N8nText size="medium" color="text-dark" bold>
					{{ i18n.baseText('instanceAi.appBlueprint.bindings.title') }}
				</N8nText>
				<div
					v-for="binding in blueprint.bindings"
					:key="`${binding.status}:${binding.kind}:${binding.name}`"
					:class="$style.binding"
					:data-binding-kind="binding.kind"
					data-test-id="instance-ai-app-blueprint-binding"
				>
					<ToolIcon
						:source="{
							type: 'icon',
							name: bindingIcons[binding.kind],
							color: 'var(--color--text)',
						}"
					/>
					<div :class="$style.bindingLabels">
						<div :class="$style.bindingTitle">
							<N8nText size="medium" color="text-dark">{{ binding.name }}</N8nText>
							<N8nTag
								:text="i18n.baseText(`instanceAi.appBlueprint.bindings.${binding.status}`)"
								:clickable="false"
							/>
						</div>
						<N8nText size="small" color="text-light">{{ binding.description }}</N8nText>
					</div>
				</div>
			</div>
		</div>

		<div :class="$style.instructions">
			<N8nInput
				v-model="additionalInstructions"
				type="textarea"
				size="medium"
				:rows="2"
				:maxlength="2000"
				:disabled="readOnly"
				:placeholder="i18n.baseText('instanceAi.appBlueprint.instructionsPlaceholder')"
				data-test-id="instance-ai-app-blueprint-instructions"
			/>
			<div v-if="!readOnly" :class="$style.actions">
				<N8nButton
					variant="outline"
					size="medium"
					data-test-id="instance-ai-app-blueprint-cancel"
					@click="cancel"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					size="medium"
					:disabled="!isValid"
					data-test-id="instance-ai-app-blueprint-start"
					@click="startBuilding"
				>
					{{ i18n.baseText('instanceAi.appBlueprint.approve') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.card {
	max-width: 90%;
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	overflow: hidden;
}

.awaitingInput {
	border: 0;
	box-shadow: var(--shadow--sm), var(--shadow--outline);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}

.description {
	white-space: pre-wrap;
}

.fields {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
	margin-top: var(--spacing--xs);

	@include breakpoints.breakpoint('xs-only') {
		grid-template-columns: 1fr;
	}
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.bindings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}

.binding {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) 0;
}

.bindingLabels {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.bindingTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.instructions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-top: var(--border);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
