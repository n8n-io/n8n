<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import type { CustomNodeListItem } from '@n8n/api-types';
import { N8nButton, N8nEmptyState, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import CustomNodeCard from '../components/CustomNodeCard.vue';
import {
	CUSTOM_NODE_VERSIONS_MODAL_KEY,
	CUSTOM_NODE_WIZARD_MODAL_KEY,
} from '../customNodes.constants';
import { useCustomNodesStore } from '../customNodes.store';
import { readImageFileAsDataUri } from '../composables/useCustomNodeDraft';

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const uiStore = useUIStore();
const customNodesStore = useCustomNodesStore();

const logoInput = ref<HTMLInputElement>();
const logoTarget = ref<CustomNodeListItem | null>(null);

const operations = computed(() => customNodesStore.operations);
const nodes = computed(() => customNodesStore.nodes);
const isEmpty = computed(() => !customNodesStore.loading && customNodesStore.items.length === 0);

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.customNodes'));
	await customNodesStore.fetchAll();
});

function openWizard() {
	uiStore.openModalWithData({ name: CUSTOM_NODE_WIZARD_MODAL_KEY, data: {} });
}

function onEdit(item: CustomNodeListItem) {
	if (item.kind !== 'operation') return;
	uiStore.openModalWithData({
		name: CUSTOM_NODE_WIZARD_MODAL_KEY,
		data: { editOperation: item.definition },
	});
}

function onVersions(item: CustomNodeListItem) {
	if (item.kind !== 'operation') return;
	uiStore.openModalWithData({
		name: CUSTOM_NODE_VERSIONS_MODAL_KEY,
		data: { definition: item.definition },
	});
}

function onReplaceLogo(item: CustomNodeListItem) {
	logoTarget.value = item;
	logoInput.value?.click();
}

async function onLogoSelected(event: Event) {
	const file = (event.target as HTMLInputElement).files?.[0];
	(event.target as HTMLInputElement).value = '';
	if (!file || !logoTarget.value) return;
	try {
		const dataUri = await readImageFileAsDataUri(file);
		await customNodesStore.uploadIcon(logoTarget.value.id, dataUri);
		toast.showMessage({ title: i18n.baseText('settings.customNodes.logo.success'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.customNodes.logo.invalid'));
	}
}

async function onDelete(item: CustomNodeListItem) {
	const confirmed = await message.confirm(
		i18n.baseText('settings.customNodes.delete.confirm.message'),
		i18n.baseText('settings.customNodes.delete.confirm.title', {
			interpolate: { name: item.name },
		}),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;
	try {
		await customNodesStore.remove(item.id);
		toast.showMessage({ title: i18n.baseText('settings.customNodes.delete.success'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('customNodes.wizard.error.save'));
	}
}
</script>

<template>
	<div :class="$style.container" data-test-id="settings-custom-nodes">
		<div :class="$style.header">
			<div>
				<N8nHeading size="2xlarge">{{ i18n.baseText('settings.customNodes.title') }}</N8nHeading>
				<N8nText color="text-light" :class="$style.description">
					{{ i18n.baseText('settings.customNodes.description') }}
				</N8nText>
			</div>
			<N8nButton
				icon="plus"
				:label="i18n.baseText('settings.customNodes.createButton')"
				data-test-id="custom-nodes-create-button"
				@click="openWizard"
			/>
		</div>

		<N8nEmptyState
			v-if="isEmpty"
			:heading="i18n.baseText('settings.customNodes.empty.title')"
			:description="i18n.baseText('settings.customNodes.empty.description')"
			:button-text="i18n.baseText('settings.customNodes.createButton')"
			@click:button="openWizard"
		/>

		<template v-else>
			<section v-if="operations.length" :class="$style.section">
				<N8nHeading size="medium" :class="$style.sectionTitle">
					{{ i18n.baseText('settings.customNodes.section.operations') }}
				</N8nHeading>
				<CustomNodeCard
					v-for="item in operations"
					:key="item.id"
					:item="item"
					@edit="onEdit"
					@versions="onVersions"
					@delete="onDelete"
				/>
			</section>

			<section v-if="nodes.length" :class="$style.section">
				<N8nHeading size="medium" :class="$style.sectionTitle">
					{{ i18n.baseText('settings.customNodes.section.nodes') }}
				</N8nHeading>
				<CustomNodeCard
					v-for="item in nodes"
					:key="item.id"
					:item="item"
					@replace-logo="onReplaceLogo"
					@delete="onDelete"
				/>
			</section>
		</template>

		<input
			ref="logoInput"
			type="file"
			accept="image/svg+xml,image/png"
			:class="$style.hidden"
			@change="onLogoSelected"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.description {
	display: block;
	margin-top: var(--spacing--2xs);
	max-width: 640px;
}

.section {
	display: flex;
	flex-direction: column;
}

.sectionTitle {
	margin-bottom: var(--spacing--xs);
}

.hidden {
	display: none;
}
</style>
