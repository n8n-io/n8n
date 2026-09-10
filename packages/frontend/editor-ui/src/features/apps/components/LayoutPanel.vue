<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDebounceFn } from '@vueuse/core';
import type { AppLayout } from '@n8n/api-types';
import { v4 as uuidv4 } from 'uuid';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import PageContentEditor from '@/features/apps/components/PageContentEditor.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import type { Page, RenderErrors, UpdatePageInput } from '@/features/apps/apps.types';

const props = defineProps<{
	projectId: string;
	appId: string;
	page: Page;
	ownerPageId: string | null;
	renderErrors: RenderErrors;
}>();

const emit = defineEmits<{
	saved: [];
}>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

const saving = ref(false);
/** Layout waiting to be saved, pinned to the page it belongs to so a page switch cannot misfile it. */
const dirty = ref<{ pageId: string; layout: AppLayout } | null>(null);

const ownerPage = computed(() => appsStore.pages.find((p) => p.id === props.ownerPageId));
const inheritedLabel = computed(() =>
	ownerPage.value
		? i18n.baseText('apps.layout.inheritedFrom', {
				interpolate: { page: ownerPage.value.route || i18n.baseText('apps.page.home') },
			})
		: i18n.baseText('apps.layout.default'),
);

const persist = async (pageId: string, updates: UpdatePageInput) => {
	saving.value = true;
	try {
		await appsStore.updatePage(props.projectId, props.appId, pageId, updates);
		emit('saved');
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.layout.save.error'));
	} finally {
		saving.value = false;
	}
};

const flush = async () => {
	const pending = dirty.value;
	if (!pending) return;
	dirty.value = null;
	await persist(pending.pageId, { layout: pending.layout });
};

const debouncedFlush = useDebounceFn(flush, getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE));

const onLayoutChange = (layout: AppLayout) => {
	dirty.value = { pageId: props.page.id, layout };
	void debouncedFlush();
};

const customize = async () => {
	const layout = ownerPage.value?.layout ?? [{ id: uuidv4(), type: 'slot', data: {} }];
	await persist(props.page.id, { layout });
};

const inherit = async () => {
	dirty.value = null;
	await persist(props.page.id, { layout: null });
};

watch(() => props.page.id, flush);
onBeforeUnmount(flush);
</script>

<template>
	<aside :class="$style.panel" data-test-id="page-layout-panel">
		<div :class="$style.header">
			<N8nText bold>{{ i18n.baseText('apps.layout.title') }}</N8nText>
			<N8nText v-if="saving" color="text-light" size="small">
				{{ i18n.baseText('generic.saving') }}
			</N8nText>
		</div>

		<template v-if="page.layout === null">
			<N8nText color="text-light" size="small" data-test-id="page-layout-inherited">
				{{ inheritedLabel }}
			</N8nText>
			<N8nButton
				type="secondary"
				size="small"
				:disabled="saving"
				data-test-id="page-layout-customize"
				@click="customize"
			>
				{{ i18n.baseText('apps.layout.customize') }}
			</N8nButton>
		</template>

		<template v-else>
			<N8nButton
				type="secondary"
				size="small"
				:disabled="saving"
				data-test-id="page-layout-inherit"
				@click="inherit"
			>
				{{ i18n.baseText('apps.layout.inherit') }}
			</N8nButton>
			<PageContentEditor
				:key="page.id"
				schema="layout"
				:content="page.layout"
				:project-id="projectId"
				:external-issues="renderErrors"
				data-test-id="page-layout-editor"
				@update:layout="onLayoutChange"
			/>
		</template>

		<N8nText
			v-for="(message, blockId) in renderErrors"
			:key="blockId"
			color="danger"
			size="small"
			:class="$style.renderError"
			data-test-id="page-layout-render-error"
		>
			{{ i18n.baseText('apps.layout.renderError', { interpolate: { id: blockId, message } }) }}
		</N8nText>
	</aside>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
	width: 24rem;
	flex: none;
	padding: var(--spacing--sm);
	border-left: var(--border);
	background: var(--background--surface);
	overflow: auto;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.renderError {
	white-space: pre-line;
	word-break: break-word;
}
</style>
