<script lang="ts" setup>
import { computed, h, ref } from 'vue';
import { useFormsStore, useUIStore, useSettingsStore } from '@/stores';
import { useI18n, useTelemetry, useToast, useUpgradeLink, useMessage } from '@/composables';

import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import FormCard from '@/components/FormCard.vue';

import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import { IForm } from '@/Interface';
import { useRouter } from 'vue-router/composables';

const settingsStore = useSettingsStore();
const formsStore = useFormsStore();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const i18n = useI18n();
const message = useMessage();
const router = useRouter();

const { showError } = useToast();

const allForms = computed(() => formsStore.forms);

const isFeatureEnabled = computed(
	() => true || settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Forms),
);
const contextBasedTranslationKeys = computed(() => uiStore.contextBasedTranslationKeys);
const { upgradeLinkUrl } = useUpgradeLink({
	default: '&source=forms',
	desktop: '&utm_campaign=upgrade-forms',
});

async function initialize() {
	await formsStore.fetchAllForms();
}

async function createForm() {
	const id = await formsStore.createForm({
		title: 'My new form',
		schema: '',
	});

	await openEditForm({ id });
}

async function openForm({ id }: { id: IForm['id'] }) {
	await router.push({
		name: VIEWS.FORM,
		params: {
			id,
		},
	});
}

async function openEditForm({ id }: { id: IForm['id'] }) {
	await router.push({
		name: VIEWS.FORM_BUILDER,
		params: {
			id,
		},
	});
}

async function deleteForm(data: IForm) {
	const confirmed = await message.confirm(
		i18n.baseText('variables.modals.deleteConfirm.message'),
		i18n.baseText('variables.modals.deleteConfirm.title'),
		{
			confirmButtonText: i18n.baseText('variables.modals.deleteConfirm.confirmButton'),
			cancelButtonText: i18n.baseText('variables.modals.deleteConfirm.cancelButton'),
		},
	);

	if (!confirmed) {
		return;
	}

	try {
		await formsStore.deleteForm(data);
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.delete'));
	}
}

function goToUpgrade() {
	window.open(upgradeLinkUrl.value, '_blank');
}

function displayName(resource: IForm) {
	return resource.title;
}
</script>

<template>
	<ResourcesListLayout
		ref="layout"
		resource-key="forms"
		:disabled="!isFeatureEnabled"
		:resources="allForms"
		:initialize="initialize"
		:shareable="false"
		:item-size="61"
		:sortOptions="['nameAsc', 'nameDesc']"
		:showFiltersDropdown="false"
		:displayName="displayName"
		@click:add="createForm"
	>
		<template v-if="!isFeatureEnabled" #empty>
			<n8n-action-box
				data-test-id="empty-resources-list"
				emoji="👋"
				:heading="$locale.baseText(contextBasedTranslationKeys.variables.unavailable.title)"
				:description="
					$locale.baseText(contextBasedTranslationKeys.variables.unavailable.description)
				"
				:buttonText="$locale.baseText(contextBasedTranslationKeys.variables.unavailable.button)"
				buttonType="secondary"
				@click="goToUpgrade"
			/>
		</template>
		<template #default="{ data }">
			<FormCard :key="data.id" :data="data" @click="openForm" @delete="deleteForm" class="mb-2xs" />
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.type-input {
	--max-width: 265px;
}

.sidebarContainer ul {
	padding: 0 !important;
}
</style>
