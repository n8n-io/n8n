<script setup lang="ts">
import { appNameSchema, appNamespaceSchema, type UpdateAppDto } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nHeading,
	N8nInput,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nText,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { updateApp } from '../../apps.api';
import { getAppPermissions } from '../../apps.permissions';
import type { AppConfigureTabEmits, AppConfigureTabProps } from './appConfigureTabs';

const FIELDS = [
	{
		id: 'name',
		schema: appNameSchema,
		maxLength: 128,
		label: 'apps.configure.basics.name',
		description: undefined,
		invalidText: 'apps.configure.basics.nameInvalid',
	},
	{
		id: 'namespace',
		schema: appNamespaceSchema,
		maxLength: 54,
		label: 'apps.configure.basics.namespace',
		description: 'apps.configure.basics.namespaceDescription',
		invalidText: 'apps.configure.basics.namespaceInvalid',
	},
] as const;
type Field = (typeof FIELDS)[number]['id'];

const props = defineProps<AppConfigureTabProps>();

const emit = defineEmits<AppConfigureTabEmits>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();

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
		i18n.baseText('apps.configure.basics.namespaceConfirm.message'),
		i18n.baseText('apps.configure.basics.namespaceConfirm.title'),
		{
			confirmButtonText: i18n.baseText('apps.configure.basics.namespaceConfirm.confirm'),
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
		toast.showError(error, i18n.baseText('apps.configure.basics.saveError'));
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
	<div data-test-id="app-configure-basics">
		<N8nSettingsRowGroup>
			<div :class="$style.cardHeader">
				<N8nHeading tag="h2" size="medium" color="text-dark">
					{{ i18n.baseText('apps.configure.basics.title') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('apps.configure.basics.description') }}
				</N8nText>
			</div>
			<N8nSettingsRow
				v-for="field in FIELDS"
				:key="field.id"
				:title="i18n.baseText(field.label)"
				:description="field.description && i18n.baseText(field.description)"
				layout="vertical"
			>
				<template #action>
					<div :class="$style.field">
						<N8nInput
							v-model="form[field.id]"
							:class="{ [$style.invalid]: invalid.has(field.id) }"
							:maxlength="field.maxLength"
							:disabled="!canUpdate || saving[field.id]"
							:aria-label="i18n.baseText(field.label)"
							:data-test-id="`app-configure-${field.id}`"
							@blur="commit(field.id)"
							@keydown="onKeydown($event, field.id)"
						/>
						<N8nText
							v-if="invalid.has(field.id)"
							:class="$style.error"
							:data-test-id="`app-configure-${field.id}-error`"
						>
							{{ i18n.baseText(field.invalidText) }}
						</N8nText>
					</div>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
	</div>
</template>

<style lang="scss" module>
.field {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.field .invalid {
	--input--border-color: var(--color--danger);
}

.error {
	margin-top: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
}

.cardHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}
</style>
