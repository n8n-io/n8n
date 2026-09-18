<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { CustomOperationDefinition } from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nNotice, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { CUSTOM_NODE_VERSIONS_MODAL_KEY } from '../customNodes.constants';
import { useCustomNodesStore } from '../customNodes.store';

interface ModalData {
	definition: CustomOperationDefinition;
}

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const customNodesStore = useCustomNodesStore();
const modalBus = createEventBus();

const modalData = computed(
	() => uiStore.modalsById[CUSTOM_NODE_VERSIONS_MODAL_KEY]?.data as ModalData | undefined,
);

const definition = computed(() => {
	const id = modalData.value?.definition.id;
	const fresh = customNodesStore.operations.find((item) => item.id === id);
	return fresh?.kind === 'operation' ? fresh.definition : modalData.value?.definition;
});

const versions = computed(() =>
	[...(definition.value?.versions ?? [])].sort((a, b) => b.version - a.version),
);

const saving = ref<number | null>(null);

async function setActive(version: number) {
	if (!definition.value) return;
	saving.value = version;
	try {
		await customNodesStore.setActiveVersion(definition.value.id, version);
		toast.showMessage({
			title: i18n.baseText('settings.customNodes.versions.updated'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('customNodes.wizard.error.save'));
	} finally {
		saving.value = null;
	}
}

function formatDate(value: string) {
	return new Date(value).toLocaleString();
}
</script>

<template>
	<Modal
		width="560px"
		:name="CUSTOM_NODE_VERSIONS_MODAL_KEY"
		:title="
			i18n.baseText('settings.customNodes.versions.title', {
				interpolate: { name: definition?.name ?? '' },
			})
		"
		:event-bus="modalBus"
	>
		<template #content>
			<N8nNotice :content="i18n.baseText('settings.customNodes.versions.hint')" />
			<div :class="$style.list">
				<div
					v-for="version in versions"
					:key="version.version"
					:class="$style.version"
					data-test-id="custom-node-version-row"
				>
					<div :class="$style.versionBody">
						<div :class="$style.versionTitle">
							<N8nText bold>v{{ version.version }}</N8nText>
							<N8nBadge
								v-if="version.version === definition?.activeVersion"
								theme="success"
								size="small"
							>
								{{ i18n.baseText('settings.customNodes.versions.active') }}
							</N8nBadge>
						</div>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('settings.customNodes.versions.created', {
									interpolate: { date: formatDate(version.createdAt) },
								})
							}}
							·
							{{
								i18n.baseText('settings.customNodes.versions.inputs', {
									interpolate: { count: String(version.inputs.length) },
								})
							}}
							· {{ version.request.method }} {{ version.request.url }}
						</N8nText>
						<N8nText v-if="version.changelog" size="small">{{ version.changelog }}</N8nText>
					</div>
					<N8nButton
						v-if="version.version !== definition?.activeVersion"
						size="small"
						variant="outline"
						:loading="saving === version.version"
						:label="i18n.baseText('settings.customNodes.versions.setActive')"
						@click="setActive(version.version)"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}

.version {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.versionBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.versionTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
