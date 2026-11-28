<script setup lang="ts">
import {
	appNameSchema,
	appNamespaceSchema,
	type AppResponse,
	type UpdateAppDto,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nCard, N8nInput, N8nText, useMessage } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, useId, watch } from 'vue';

import { updateApp } from '../../apps.api';
import { getAppPermissions } from '../../apps.permissions';

const FIELDS = [
	{
		id: 'name',
		schema: appNameSchema,
		maxLength: 128,
		label: 'apps.configure.general.name',
		description: undefined,
		invalidText: 'apps.configure.general.nameInvalid',
	},
	{
		id: 'namespace',
		schema: appNamespaceSchema,
		maxLength: 54,
		label: 'apps.configure.general.namespace',
		description: 'apps.configure.general.namespaceDescription',
		invalidText: 'apps.configure.general.namespaceInvalid',
	},
] as const;
type Field = (typeof FIELDS)[number]['id'];

const props = defineProps<{ app: AppResponse }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const headingId = useId();
const fieldId = useId();

// The parts of the app URL around the namespace, for example `https://` and `.apps.example.com`.
const appUrl = computed(() => settingsStore.moduleSettings.apps?.appUrl);

const form = ref<Record<Field, string>>({ name: props.app.name, namespace: props.app.namespace });
const saving = ref<Partial<Record<Field, boolean>>>({});
let pendingSave = Promise.resolve();

const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
const invalid = computed(
	() =>
		new Set(
			FIELDS.filter(({ id, schema }) => !schema.safeParse(form.value[id]).success).map(
				({ id }) => id,
			),
		),
);

function reset(field: Field) {
	form.value[field] = props.app[field];
}

async function confirmNamespaceChange() {
	if (!props.app.publishedUrl) return true;
	const answer = await message.confirm(
		i18n.baseText('apps.configure.general.namespaceConfirm.message'),
		i18n.baseText('apps.configure.general.namespaceConfirm.title'),
		{
			confirmButtonText: i18n.baseText('apps.configure.general.namespaceConfirm.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);
	return answer === 'confirm';
}

async function save(field: Field, value: string) {
	try {
		if (field === 'namespace' && !(await confirmNamespaceChange())) {
			reset(field);
			return;
		}
		const changes: UpdateAppDto = {};
		changes[field] = value;
		emit(
			'updated',
			await updateApp(rootStore.restApiContext, props.app.projectId, props.app.id, changes),
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.configure.general.saveError'));
	} finally {
		saving.value[field] = false;
	}
}

function commit(field: Field) {
	const value = form.value[field].trim();
	if (saving.value[field] || invalid.value.has(field)) return;
	if (value === props.app[field]) {
		reset(field);
		return;
	}
	saving.value[field] = true;
	pendingSave = pendingSave.then(async () => await save(field, value));
}

function onKeydown(event: KeyboardEvent, field: Field) {
	if (event.key === 'Escape') reset(field);
	if ((event.key === 'Enter' || event.key === 'Escape') && event.target instanceof HTMLElement) {
		event.target.blur();
	}
}

watch(
	() => props.app.name,
	() => reset('name'),
);
watch(
	() => props.app.namespace,
	() => reset('namespace'),
);
</script>

<template>
	<N8nCard :class="$style.panel" data-test-id="app-configure-general">
		<section :class="$style.body" :aria-labelledby="headingId">
			<div :class="$style.header">
				<N8nText :id="headingId" tag="h2" bold>
					{{ i18n.baseText('apps.configure.general.title') }}
				</N8nText>
				<N8nText color="text-light" :class="$style.description">
					{{ i18n.baseText('apps.configure.general.description') }}
				</N8nText>
			</div>
			<div v-for="field in FIELDS" :key="field.id" :class="$style.field">
				<div :class="$style.fieldHeader">
					<N8nText tag="label" :for="`${fieldId}-${field.id}`" bold>
						{{ i18n.baseText(field.label) }}
					</N8nText>
					<N8nText v-if="field.description" color="text-light">
						{{ i18n.baseText(field.description) }}
					</N8nText>
				</div>
				<!-- The URL parts sit outside N8nInput: its prepend and append slots expect a padded container. -->
				<div :class="{ [$style.url]: field.id === 'namespace' && appUrl }">
					<span
						v-if="field.id === 'namespace' && appUrl"
						:class="[$style.urlPart, $style.urlPrefix]"
						data-test-id="app-configure-namespace-prefix"
					>
						{{ appUrl.prefix }}
					</span>
					<N8nInput
						:id="`${fieldId}-${field.id}`"
						v-model="form[field.id]"
						:class="[$style.input, { [$style.invalid]: invalid.has(field.id) }]"
						size="large"
						:maxlength="field.maxLength"
						:disabled="!canUpdate || saving[field.id]"
						:data-test-id="`app-configure-${field.id}`"
						@blur="commit(field.id)"
						@keydown="onKeydown($event, field.id)"
					/>
					<span
						v-if="field.id === 'namespace' && appUrl"
						:class="[$style.urlPart, $style.urlSuffix]"
						:title="appUrl.suffix"
						data-test-id="app-configure-namespace-suffix"
					>
						{{ appUrl.suffix }}
					</span>
				</div>
				<N8nText
					v-if="invalid.has(field.id)"
					:class="$style.error"
					:data-test-id="`app-configure-${field.id}-error`"
				>
					{{ i18n.baseText(field.invalidText) }}
				</N8nText>
			</div>
		</section>
	</N8nCard>
</template>

<style lang="scss" module>
/* Same panel as Connections: 20px above and below, 16px at the sides. */
.panel {
	--card--padding: var(--spacing--md) var(--spacing--sm);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.header,
.fieldHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.description {
	max-width: 80%;
	text-wrap: balance;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.field .invalid {
	--input--border-color: var(--color--danger);
}

.input {
	width: 100%;
}

/* One rounded field: grey prefix, the input, grey suffix. */
.url {
	display: flex;
	align-items: stretch;
	min-width: 0;

	/* N8nInput reads these corner variables, so only the outer corners are round. */
	--input--radius--top-left: 0;
	--input--radius--bottom-left: 0;
	--input--radius--top-right: 0;
	--input--radius--bottom-right: 0;

	/* The namespace keeps at least 40% of the field. A long host shortens with an ellipsis instead. */
	.input {
		flex: 1 0 40%;
		min-width: 0;
	}
}

.urlPart {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	padding: 0 var(--spacing--xs);
	border: var(--border);
	background-color: var(--background--subtle);
	font-size: var(--font-size--sm);
	color: var(--text-color--subtle);
	white-space: nowrap;
}

/* The input draws the line between each part and itself. */
.urlPrefix {
	border-right: none;
	border-radius: var(--radius--xs) 0 0 var(--radius--xs);
}

/* A block, not a flex box, so that a long host ends in an ellipsis. */
.urlSuffix {
	display: block;
	align-content: center;
	flex-shrink: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	border-left: none;
	border-radius: 0 var(--radius--xs) var(--radius--xs) 0;
}

.error {
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
}
</style>
