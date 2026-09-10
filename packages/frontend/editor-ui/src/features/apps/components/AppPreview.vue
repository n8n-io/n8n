<script setup lang="ts">
import {
	N8nCallout,
	N8nIconButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nToggle,
	N8nToggleGroup,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDebounceFn } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import AppPreviewFrame from '@/features/apps/components/AppPreviewFrame.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App, RenderErrors } from '@/features/apps/apps.types';
import {
	getAncestorPages,
	getDynamicParamNames,
	getPageOptions,
	getPagePath,
} from '@/features/apps/pageTree.utils';

type PreviewDevice = 'desktop' | 'mobile';

const PREVIEW_WIDTHS: Record<PreviewDevice, string> = { desktop: '100%', mobile: '390px' };

const props = defineProps<{
	projectId: string;
	appId: string;
	pageId: string | null;
	app: App;
}>();

const emit = defineEmits<{
	'update:pageId': [pageId: string];
}>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

const device = ref<PreviewDevice>('desktop');
const paramValues = ref<Record<string, string>>({});
const html = ref<string | null>(null);
const renderErrors = ref<RenderErrors>({});
const loading = ref(false);

const page = computed(() => appsStore.pages.find((p) => p.id === props.pageId));
const pageOptions = computed(() =>
	getPageOptions(appsStore.pages, i18n.baseText('apps.page.index')),
);
const path = computed(() =>
	page.value ? getPagePath(getAncestorPages(appsStore.pages, page.value.id), page.value.route) : '',
);
const paramNames = computed(() => getDynamicParamNames(path.value));

const hasRenderErrors = computed(() => Object.keys(renderErrors.value).length > 0);

const fetchHtml = async () => {
	if (!page.value) {
		html.value = null;
		return;
	}
	loading.value = true;
	try {
		const preview = await appsStore.fetchPreview(props.projectId, props.appId, page.value.id, {
			path: path.value,
			params: paramValues.value,
		});
		html.value = preview.html;
		renderErrors.value = preview.errors;
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.preview.error'));
		html.value = null;
		renderErrors.value = {};
	} finally {
		loading.value = false;
	}
};

const debouncedFetchHtml = useDebounceFn(
	fetchHtml,
	getDebounceTime(DEBOUNCE_TIME.INPUT.TEXT_CHANGE),
);

const onDeviceChange = (value: unknown) => {
	if (value === 'desktop' || value === 'mobile') device.value = value;
};

onMounted(fetchHtml);
watch(() => props.pageId, fetchHtml);
watch(paramValues, debouncedFetchHtml, { deep: true });
</script>

<template>
	<div :class="$style.preview" data-test-id="app-builder-preview">
		<div :class="$style.head">
			<N8nText tag="h2" size="large" bold>{{ app.name }}</N8nText>
			<div :class="$style.tools">
				<N8nSelect
					:model-value="pageId"
					size="small"
					:class="$style.pageSelect"
					data-test-id="app-preview-page-select"
					@update:model-value="emit('update:pageId', $event)"
				>
					<N8nOption
						v-for="option in pageOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
				<N8nInput
					v-for="paramName in paramNames"
					:key="paramName"
					v-model="paramValues[paramName]"
					size="small"
					:class="$style.paramInput"
					:placeholder="paramName"
					data-test-id="app-preview-param-input"
				/>
				<N8nToggleGroup
					:model-value="device"
					variant="ghost"
					size="small"
					data-test-id="app-preview-device"
					@update:model-value="onDeviceChange"
				>
					<template #default="{ variant, size }">
						<N8nToggle
							value="desktop"
							icon="monitor"
							:label="i18n.baseText('apps.builder.desktop')"
							:variant="variant"
							:size="size"
							data-test-id="app-preview-device-desktop"
						/>
						<N8nToggle
							value="mobile"
							icon="smartphone"
							:label="i18n.baseText('apps.builder.mobile')"
							:variant="variant"
							:size="size"
							data-test-id="app-preview-device-mobile"
						/>
					</template>
				</N8nToggleGroup>
				<N8nTooltip :content="i18n.baseText('apps.builder.refresh')">
					<N8nIconButton
						icon="refresh-cw"
						variant="ghost"
						size="small"
						:aria-label="i18n.baseText('apps.builder.refresh')"
						data-test-id="app-preview-refresh"
						@click="fetchHtml"
					/>
				</N8nTooltip>
			</div>
		</div>
		<N8nCallout v-if="hasRenderErrors" theme="danger" data-test-id="app-preview-render-errors">
			{{ i18n.baseText('apps.preview.renderErrors') }}
			<ul :class="$style.renderErrorList">
				<li v-for="(message, blockId) in renderErrors" :key="blockId">
					{{ i18n.baseText('apps.layout.renderError', { interpolate: { id: blockId, message } }) }}
				</li>
			</ul>
		</N8nCallout>
		<AppPreviewFrame :html="html" :loading="loading" :width="PREVIEW_WIDTHS[device]" />
	</div>
</template>

<style lang="scss" module>
.preview {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	gap: var(--spacing--xs);
}

.head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.tools {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.pageSelect {
	width: 220px;
}

.paramInput {
	width: 140px;
}

.renderErrorList {
	margin: var(--spacing--3xs) 0 0;
	padding-left: var(--spacing--md);
	white-space: pre-line;
	word-break: break-word;
}
</style>
