<script setup lang="ts">
import { appNameSchema, type AppBlueprint, type InstanceAiConfirmRequest } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nIcon,
	N8nInput,
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
	/** n8n tried to create the app after approval and failed. */
	failed?: boolean;
}>();

const emit = defineEmits<{ submit: [body: InstanceAiConfirmRequest] }>();

const i18n = useI18n();
const name = ref(props.blueprint.name);
const additionalInstructions = ref(props.blueprint.additionalInstructions ?? '');

const bindingIcons: Record<AppBlueprintBinding['kind'], IconName> = {
	workflow: 'workflow',
	dataTable: 'table',
	agent: 'robot',
};

// The user only edits the title. The server makes the namespace unique,
// and apps are only available in their project.
const editedBlueprint = computed<AppBlueprint>(() => ({
	name: name.value.trim(),
	namespace: props.blueprint.namespace,
	visibility: 'project',
	description: props.blueprint.description,
	theme: props.blueprint.theme,
	...(props.blueprint.bindings ? { bindings: props.blueprint.bindings } : {}),
	...(additionalInstructions.value.trim()
		? { additionalInstructions: additionalInstructions.value.trim() }
		: {}),
}));
const isValid = computed(
	() =>
		appNameSchema.safeParse(editedBlueprint.value.name).success &&
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
		<header :class="$style.header">
			<N8nIcon icon="layout-template" size="medium" />
			<N8nText size="medium" color="text-dark" bold>
				{{ i18n.baseText('instanceAi.appBlueprint.title') }}
			</N8nText>
		</header>

		<div :class="$style.content">
			<N8nText
				size="medium"
				color="text-base"
				:class="$style.description"
				data-test-id="instance-ai-app-blueprint-description"
			>
				{{ blueprint.description }}
			</N8nText>

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
							<N8nBadge
								v-if="binding.status === 'new'"
								variant="secondary"
								size="xxsmall"
								data-test-id="instance-ai-app-blueprint-binding-status"
							>
								{{ i18n.baseText('instanceAi.appBlueprint.bindings.new') }}
							</N8nBadge>
							<N8nTag
								v-else
								:text="i18n.baseText('instanceAi.appBlueprint.bindings.existing')"
								:clickable="false"
								data-test-id="instance-ai-app-blueprint-binding-status"
							/>
						</div>
						<N8nText size="small" color="text-light">{{ binding.description }}</N8nText>
					</div>
				</div>
			</div>
		</div>

		<div
			v-if="failed"
			:class="$style.failed"
			role="alert"
			data-test-id="instance-ai-app-blueprint-failed"
		>
			<N8nText size="medium" color="danger">
				{{ i18n.baseText('instanceAi.appBlueprint.failed') }}
			</N8nText>
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
		</div>

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
</template>

<style lang="scss" module>
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

/* Same header as InstanceAiMcpConnectCard. */
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
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

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	margin-top: var(--spacing--xs);
}

.bindings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
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

.failed {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}
</style>
