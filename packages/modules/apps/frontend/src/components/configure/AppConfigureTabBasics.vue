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

const SCHEMAS = { name: appNameSchema, namespace: appNamespaceSchema };
type Field = keyof typeof SCHEMAS;

const props = defineProps<AppConfigureTabProps>();

const emit = defineEmits<AppConfigureTabEmits>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();

const form = ref<Record<Field, string>>({ name: props.app.name, namespace: props.app.namespace });
const saving = ref<Partial<Record<Field, boolean>>>({});

const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
const namespaceValid = computed(() => SCHEMAS.namespace.safeParse(form.value.namespace).success);

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

async function commit(field: Field) {
	const value = form.value[field].trim();
	if (saving.value[field]) return;
	if (value === props.app[field] || !SCHEMAS[field].safeParse(value).success) {
		reset(field);
		return;
	}
	saving.value[field] = true;
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
			<N8nSettingsRow :title="i18n.baseText('apps.configure.basics.name')" layout="vertical">
				<template #action>
					<N8nInput
						v-model="form.name"
						:maxlength="128"
						:disabled="!canUpdate || saving.name"
						:aria-label="i18n.baseText('apps.configure.basics.name')"
						data-test-id="app-configure-name"
						@blur="commit('name')"
						@keydown="onKeydown($event, 'name')"
					/>
				</template>
			</N8nSettingsRow>
			<N8nSettingsRow
				:title="i18n.baseText('apps.configure.basics.namespace')"
				:description="i18n.baseText('apps.configure.basics.namespaceDescription')"
				layout="vertical"
			>
				<template #action>
					<div :class="$style.field">
						<N8nInput
							v-model="form.namespace"
							:class="{ [$style.invalid]: !namespaceValid }"
							:maxlength="54"
							:disabled="!canUpdate || saving.namespace"
							:aria-label="i18n.baseText('apps.configure.basics.namespace')"
							data-test-id="app-configure-namespace"
							@blur="commit('namespace')"
							@keydown="onKeydown($event, 'namespace')"
						/>
						<N8nText
							v-if="!namespaceValid"
							:class="$style.error"
							data-test-id="app-configure-namespace-error"
						>
							{{ i18n.baseText('apps.configure.basics.namespaceInvalid') }}
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
