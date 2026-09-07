<script setup lang="ts">
import { N8nButton, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import Modal from '@/app/components/Modal.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import { APP_PAGE_DETAILS } from '@/features/apps/apps.constants';
import { useUIStore } from '@/app/stores/ui.store';

type AddPageModalData = { projectId: string; appId: string; parentPageId: string | null };

const props = defineProps<{
	modalName: string;
	data: AddPageModalData;
}>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const uiStore = useUIStore();
const appsStore = useAppsStore();

// Only a top-level page can be the index page, so a sub-page is told it needs
// a route of its own rather than being offered a blank one the API rejects.
const routeHint = computed(() =>
	i18n.baseText(
		props.data.parentPageId
			? 'apps.page.add.input.route.subPage.hint'
			: 'apps.page.add.input.route.hint',
	),
);

const route = ref('');
const isCreating = ref(false);
const routeInputRef = ref<HTMLInputElement | null>(null);

const onSubmit = async () => {
	if (isCreating.value) return;
	isCreating.value = true;
	try {
		const page = await appsStore.createPage(
			props.data.projectId,
			props.data.appId,
			route.value,
			props.data.parentPageId ?? undefined,
		);
		uiStore.closeModal(props.modalName);
		await router.push({
			name: APP_PAGE_DETAILS,
			params: { projectId: props.data.projectId, appId: props.data.appId, pageId: page.id },
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.page.add.error'));
	} finally {
		isCreating.value = false;
	}
};

onMounted(() => {
	setTimeout(() => routeInputRef.value?.focus(), 0);
});
</script>

<template>
	<Modal :name="props.modalName" :center="true" width="480px" data-test-id="add-page-modal">
		<template #header>
			<h2>{{ i18n.baseText('apps.page.new') }}</h2>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nInputLabel
					:label="i18n.baseText('apps.page.add.input.route.label')"
					input-name="pageRoute"
				>
					<N8nInput
						ref="routeInputRef"
						v-model="route"
						:placeholder="i18n.baseText('apps.page.add.input.route.placeholder')"
						name="pageRoute"
						data-test-id="app-page-new-route"
						@keydown.enter="onSubmit"
					/>
				</N8nInputLabel>
				<N8nText color="text-light" size="small">
					{{ routeHint }}
				</N8nText>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					size="large"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="app-page-new-cancel"
					@click="uiStore.closeModal(props.modalName)"
				/>
				<N8nButton
					:loading="isCreating"
					size="large"
					:label="i18n.baseText('apps.page.new')"
					data-test-id="app-page-new-submit"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}
</style>
