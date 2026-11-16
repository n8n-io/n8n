<script setup lang="ts">
import type { UiExtensionPageContext, UiExtensionPanelData } from '@n8n/api-types';
import { N8nIconButton, N8nResizeWrapper, N8nTabs, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, watchEffect } from 'vue';

import { getBuiltinView } from '../ui-extensions.builtin';
import {
	SIDE_PANEL_MAX_WIDTH,
	SIDE_PANEL_MIN_WIDTH,
	SIDE_PANEL_RAIL_WIDTH,
} from '../ui-extensions.constants';
import { useSidePanelStore } from '../ui-extensions.store';
import type { ViewOpenTarget, ViewRuntimeAssets } from '../ui-extensions.types';
import ViewFrame from './ViewFrame.vue';

defineProps<{
	pageContext: UiExtensionPageContext;
	workflowAvailableInMcp: boolean;
	/** `null` while the shell loads the runtime. */
	runtime: ViewRuntimeAssets | null;
	/** Run and service data for the built-in views. */
	panelData: UiExtensionPanelData;
	locale: string;
}>();

const emit = defineEmits<{
	refresh: [];
	open: [target: ViewOpenTarget];
}>();

/** True while the shell must fetch data: the panel is open on a built-in view that shows it. */
const dataEnabled = defineModel<boolean>('dataEnabled', { default: false });

const i18n = useI18n();
const store = useSidePanelStore();

const tabs = computed(() =>
	store.views.map((view) => ({ value: view.id, label: view.title, icon: view.icon })),
);

const toggleLabel = computed(() =>
	i18n.baseText(store.isOpen ? 'uiExtensions.sidePanel.close' : 'uiExtensions.sidePanel.open'),
);

watchEffect(() => {
	const view = store.activeView;
	dataEnabled.value = store.isOpen && view.builtin && (getBuiltinView(view.id)?.usesData ?? false);
});

function onResize({ width }: { width: number }) {
	store.width = width;
}

// The fallback when no push connection delivers the change.
function onFocus() {
	void store.fetchViews();
}

onMounted(() => {
	window.addEventListener('focus', onFocus);
	void store.fetchViews();
});
onBeforeUnmount(() => window.removeEventListener('focus', onFocus));
</script>

<template>
	<div :class="$style.sidePanel" data-test-id="ui-extensions-side-panel">
		<N8nResizeWrapper
			v-if="store.isOpen"
			:class="$style.resizeWrapper"
			:width="store.width"
			:min-width="SIDE_PANEL_MIN_WIDTH"
			:max-width="SIDE_PANEL_MAX_WIDTH"
			:supported-directions="['left']"
			@resize="onResize"
		>
			<div
				:class="$style.panel"
				:style="{ width: `${store.width}px` }"
				data-test-id="ui-extensions-side-panel-content"
			>
				<div :class="$style.header">
					<N8nText tag="h2" size="small" bold>{{
						i18n.baseText('uiExtensions.sidePanel.title')
					}}</N8nText>
				</div>
				<N8nTabs
					v-model="store.activeViewId"
					:class="$style.tabs"
					:options="tabs"
					size="small"
					data-test-id="ui-extensions-side-panel-tabs"
				/>
				<ViewFrame
					v-if="runtime"
					:key="`${store.activeView.id}:${store.activeView.updatedAt}`"
					:view="store.activeView"
					:page-context="pageContext"
					:workflow-available-in-mcp="workflowAvailableInMcp"
					:runtime="runtime"
					:panel-data="panelData"
					:locale="locale"
					@refresh="emit('refresh')"
					@open="emit('open', $event)"
				/>
			</div>
		</N8nResizeWrapper>
		<div :class="$style.rail" :style="{ width: `${SIDE_PANEL_RAIL_WIDTH}px` }">
			<N8nIconButton
				icon="panel-right"
				variant="ghost"
				size="small"
				:aria-label="toggleLabel"
				:title="toggleLabel"
				:aria-pressed="store.isOpen"
				data-test-id="ui-extensions-side-panel-toggle"
				@click="store.toggle()"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.sidePanel {
	display: flex;
	height: 100%;
	border-left: var(--border);
	background-color: var(--background--surface);
}

.resizeWrapper {
	height: 100%;
}

.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	border-right: var(--border);
}

.header {
	display: flex;
	align-items: center;
	padding: var(--spacing--xs) var(--spacing--sm) 0;
}

.tabs {
	padding: 0 var(--spacing--xs);
}

.rail {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: var(--spacing--xs);
}
</style>
