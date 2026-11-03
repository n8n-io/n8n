<script setup lang="ts">
import type { AppBinding, AppBindingKind, AppResponse } from '@n8n/api-types';
import { N8nHeading, N8nSettingsRowGroup, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';

import type { BindableResource } from '../../../apps.api';
import { getAppPermissions } from '../../../apps.permissions';
import { useAppBindings } from '../../../composables/useAppBindings';
import type { AppVersions } from '../../../composables/useAppVersions';
import AppBindingChip from './AppBindingChip.vue';
import AppBindingPicker from './AppBindingPicker.vue';
import { deriveBindingKey } from './bindingKey';
import {
	BINDING_KIND_ORDER,
	BINDING_KINDS,
	createBinding,
	resourceIdOf,
	withPermissions,
	type BindingPermission,
} from './bindingKinds';

const props = defineProps<{ app: AppResponse; versions: AppVersions }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();

const i18n = useI18n();
const { bindings, warningsByKey, load, save } = useAppBindings(() => props.app);

const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
const rows = computed(() =>
	BINDING_KIND_ORDER.map((kind) => {
		const ofKind = bindings.value.filter((binding) => binding.kind === kind);
		return {
			kind,
			label: BINDING_KINDS[kind].label,
			bindings: ofKind,
			boundIds: new Set(ofKind.map(resourceIdOf)),
		};
	}),
);

async function persist(update: (current: AppBinding[]) => AppBinding[]) {
	const response = await save(update);
	if (!response) return;
	emit('updated', { ...props.app, draftVersionId: response.versionId });
	await props.versions.refresh();
}

async function add(
	kind: AppBindingKind,
	resource: BindableResource,
	permissions: BindingPermission[],
) {
	await persist((current) => [
		...current,
		createBinding(
			kind,
			deriveBindingKey(
				resource.name,
				kind,
				current.map(({ key }) => key),
			),
			resource.id,
			permissions,
		),
	]);
}

async function update(key: string, permissions: BindingPermission[]) {
	await persist((current) =>
		current.map((binding) =>
			binding.key === key ? withPermissions(binding, permissions) : binding,
		),
	);
}

async function remove(key: string) {
	await persist((current) => current.filter((binding) => binding.key !== key));
}

onMounted(load);
</script>

<template>
	<N8nSettingsRowGroup data-test-id="app-configure-connections">
		<div :class="$style.header">
			<N8nHeading tag="h2" size="medium" color="text-dark">
				{{ i18n.baseText('apps.configure.connections.title') }}
			</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('apps.configure.connections.description') }}
			</N8nText>
		</div>
		<div :class="$style.rows">
			<template v-for="row in rows" :key="row.kind">
				<N8nText bold size="small">{{ i18n.baseText(row.label) }}</N8nText>
				<div :class="$style.chips" :data-test-id="`app-connections-${row.kind}`">
					<AppBindingChip
						v-for="binding in row.bindings"
						:key="binding.key"
						:binding="binding"
						:project-id="app.projectId"
						:warning="warningsByKey.get(binding.key)"
						:can-update="canUpdate"
						@update="update(binding.key, $event)"
						@remove="remove(binding.key)"
					/>
					<AppBindingPicker
						v-if="canUpdate"
						:kind="row.kind"
						:project-id="app.projectId"
						:bound-ids="row.boundIds"
						@add="(resource, permissions) => add(row.kind, resource, permissions)"
					/>
				</div>
			</template>
		</div>
	</N8nSettingsRowGroup>
</template>

<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.rows {
	display: grid;
	grid-template-columns: max-content 1fr;
	align-items: center;
	gap: var(--spacing--sm) var(--spacing--lg);
	padding: var(--spacing--sm);
}

.chips {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--md);
}
</style>
