<script setup lang="ts">
import type { UiExtensionPageContext, UiExtensionPanelData } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ViewFrame from '../components/ViewFrame.vue';
import { consumeRemovedHere } from '../composables/useRemoveUiExtension';
import { getBuiltinView } from '../ui-extensions.builtin';
import { UI_EXTENSION_PAGE_VIEW } from '../ui-extensions.constants';
import { useSidePanelStore } from '../ui-extensions.store';
import { UI_EXTENSIONS_HOST_KEY } from '../ui-extensions.types';

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const store = useSidePanelStore();
const host = inject(UI_EXTENSIONS_HOST_KEY, null);

/** No workflow is open on a page, so a page sees the `other` context only. */
const PAGE_CONTEXT: UiExtensionPageContext = { page: 'other', routeName: UI_EXTENSION_PAGE_VIEW };
const NO_DATA: UiExtensionPanelData = { state: 'ready', runs: null, services: null };

const pageId = computed(() => (typeof route.params.pageId === 'string' ? route.params.pageId : ''));
const page = computed(() => store.pages.find((candidate) => candidate.id === pageId.value));

const usesData = computed(
	() => !!page.value?.builtin && (getBuiltinView(page.value.id)?.usesData ?? false),
);
const overview = host?.useOverviewData(usesData);
const panelData = computed(() => overview?.data.value ?? NO_DATA);

const locale = computed(() => host?.locale.value ?? 'en');
const runtime = computed(() => host?.runtime.value ?? null);

/** True once the page left, so it does not redirect twice. */
const isLeaving = ref(false);

// A page of the user is known only after the first fetch. Before that, it shows loading.
watch(
	[page, () => store.hasFetched],
	([current, hasFetched]) => {
		if (current || !hasFetched || isLeaving.value) return;
		isLeaving.value = true;
		if (!consumeRemovedHere(pageId.value)) {
			toast.showMessage({ type: 'info', title: i18n.baseText('uiExtensions.page.removed') });
		}
		void router.replace('/');
	},
	{ immediate: true },
);

onMounted(() => {
	host?.loadRuntime();
	if (!store.hasFetched) void store.fetchViews();
});
</script>

<template>
	<div :class="$style.page" data-test-id="ui-extensions-page">
		<N8nCallout v-if="!host" theme="danger" :class="$style.callout">
			{{ i18n.baseText('uiExtensions.page.unavailable') }}
		</N8nCallout>
		<ViewFrame
			v-else-if="page && runtime"
			:key="`${page.id}:${page.updatedAt}`"
			:view="page"
			:page-context="PAGE_CONTEXT"
			:workflow-available-in-mcp="false"
			:runtime="runtime"
			:panel-data="panelData"
			:locale="locale"
			@refresh="overview?.refresh()"
			@open="host?.open($event)"
		/>
		<N8nText
			v-else
			:class="$style.loading"
			color="text-light"
			data-test-id="ui-extensions-page-loading"
		>
			{{ i18n.baseText('uiExtensions.view.loading') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
	background-color: var(--background--surface);
}

.callout {
	margin: var(--spacing--lg);
}

.loading {
	padding: var(--spacing--lg);
}
</style>
