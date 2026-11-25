<script setup lang="ts">
import type { AppBinding, AppBindingKind, AppDescribedBinding, AppResponse } from '@n8n/api-types';
import { N8nAlertDialog, N8nCard, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, useId } from 'vue';

import type { BindableResource } from '../../../apps.api';
import { getAppPermissions } from '../../../apps.permissions';
import { useAppBindings } from '../../../composables/useAppBindings';
import type { AppVersions } from '../../../composables/useAppVersions';
import AppBindingChip from './AppBindingChip.vue';
import AppBindingDialog from './AppBindingDialog.vue';
import AppBindingPicker from './AppBindingPicker.vue';
import { deriveBindingKey } from './bindingKey';
import { BINDING_KIND_ORDER, BINDING_KINDS, createBinding, resourceIdOf } from './bindingKinds';

const props = defineProps<{ app: AppResponse; versions: AppVersions }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();

const i18n = useI18n();
const headingId = useId();
const { bindings, warningsByKey, loading, loaded, load, save } = useAppBindings(() => props.app);
const openKey = ref<string>();
// The binding to remove stays set while the confirmation fades out, so its text does not go blank.
const removeTarget = ref<AppDescribedBinding>();
const removeOpen = ref(false);

const openBinding = computed(() => bindings.value.find(({ key }) => key === openKey.value));

const canUpdate = computed(
	() => getAppPermissions(props.app.projectId).canUpdate && loaded.value && !loading.value,
);
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

async function add(kind: AppBindingKind, resource: BindableResource) {
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
			BINDING_KINDS[kind].defaultPermissions,
		),
	]);
}

function requestRemove(binding: AppDescribedBinding) {
	removeTarget.value = binding;
	removeOpen.value = true;
}

async function confirmRemove() {
	removeOpen.value = false;
	const key = removeTarget.value?.key;
	if (!key) return;
	if (openKey.value === key) openKey.value = undefined;
	await persist((current) => current.filter((binding) => binding.key !== key));
}

onMounted(load);
</script>

<template>
	<N8nCard :class="$style.panel" data-test-id="app-configure-connections">
		<section :class="$style.body" :aria-labelledby="headingId">
			<div :class="$style.header">
				<N8nText :id="headingId" tag="h2" bold>
					{{ i18n.baseText('apps.configure.connections.title') }}
				</N8nText>
				<N8nText color="text-light" :class="$style.description">
					{{ i18n.baseText('apps.configure.connections.description') }}
				</N8nText>
			</div>
			<div :class="$style.rows">
				<template v-for="row in rows" :key="row.kind">
					<div
						v-if="row.bindings.length > 0 || canUpdate"
						:class="$style.row"
						:data-test-id="`app-connections-${row.kind}`"
					>
						<!-- An empty row has no label: its add button names the kind. -->
						<N8nText v-if="row.bindings.length > 0" bold :class="$style.label">
							{{ i18n.baseText(row.label) }}
						</N8nText>
						<div :class="$style.chips">
							<AppBindingChip
								v-for="binding in row.bindings"
								:key="binding.key"
								:binding="binding"
								:warning="warningsByKey.get(binding.key)"
								:can-update="canUpdate"
								@open="openKey = binding.key"
								@remove="requestRemove(binding)"
							/>
							<AppBindingPicker
								v-if="canUpdate"
								:kind="row.kind"
								:project-id="app.projectId"
								:bound-ids="row.boundIds"
								:has-items="row.bindings.length > 0"
								:add-resource="(resource) => add(row.kind, resource)"
							/>
						</div>
					</div>
				</template>
			</div>
		</section>
		<AppBindingDialog
			v-if="openBinding"
			:binding="openBinding"
			:project-id="app.projectId"
			:warning="warningsByKey.get(openBinding.key)"
			:can-update="canUpdate"
			@close="openKey = undefined"
			@remove="requestRemove(openBinding)"
		/>
		<N8nAlertDialog
			:open="removeOpen"
			size="medium"
			:stacked="openBinding !== undefined"
			:title="
				i18n.baseText('apps.configure.connections.removeConfirm.title', {
					interpolate: { name: removeTarget?.name ?? '' },
				})
			"
			:description="removeTarget && i18n.baseText(BINDING_KINDS[removeTarget.kind].removeMessage)"
			:action-label="i18n.baseText('apps.configure.connections.removeConfirm.confirm')"
			action-variant="destructive"
			:cancel-label="i18n.baseText('generic.cancel')"
			@action="confirmRemove"
			@update:open="removeOpen = $event"
		/>
	</N8nCard>
</template>

<style lang="scss" module>
/* The Agent Builder panel: 20px above and below, 16px at the sides. */
.panel {
	--card--padding: var(--spacing--md) var(--spacing--sm);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.description {
	max-width: 80%;
	text-wrap: balance;
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

/* Same label column as an Agent chip row. */
.label {
	flex: 0 0 max(7%, calc(var(--spacing--3xl) + var(--spacing--sm)));
	margin-top: var(--spacing--3xs);
	line-height: var(--line-height--sm);
}

.chips {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

@media (max-width: 768px) {
	.row {
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.label {
		flex-basis: auto;
	}
}
</style>
