<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { storeToRefs } from 'pinia';
import { N8nResizeWrapper, N8nTabs, N8nText, N8nIcon, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useThrottleFn } from '@vueuse/core';
import type { ResizeData } from '@/Interface';
import { useSecurityScannerStore } from '../securityScanner.store';
import {
	SECURITY_TABS,
	MIN_PANEL_WIDTH,
	MAX_PANEL_WIDTH,
	type SecurityTab,
} from '../securityScanner.constants';
import SecuritySummaryBar from './SecuritySummaryBar.vue';
import SecurityFindingCard from './SecurityFindingCard.vue';

defineOptions({ name: 'SecurityPanel' });

const $style = useCssModule();
const i18n = useI18n();
const securityStore = useSecurityScannerStore();

const { panelWidth, activeTab, filteredFindings, summary, categoryCount, isAiAvailable } =
	storeToRefs(securityStore);

const tabs = computed(() =>
	SECURITY_TABS.map((tab) => ({
		label: i18n.baseText(tab.labelKey as BaseTextKey),
		value: tab.value,
		tag: categoryCount.value[tab.value] > 0 ? String(categoryCount.value[tab.value]) : undefined,
	})),
);

const selectedTab = computed({
	get: () => activeTab.value,
	set: (val: string) => securityStore.setActiveTab(val as SecurityTab),
});

function onResize(event: ResizeData) {
	securityStore.updateWidth(event.width);
}

const onResizeThrottle = useThrottleFn(onResize, 50);

function onClose() {
	securityStore.closePanel();
}

function onAnalyzeWithAi() {
	void securityStore.analyzeWithAi();
}

function onNavigateToNode(nodeName: string) {
	securityStore.navigateToNode(nodeName);
}
</script>

<template>
	<div :class="$style.wrapper" data-test-id="security-panel" @keydown.stop>
		<N8nResizeWrapper
			:width="panelWidth"
			:supported-directions="['left']"
			:min-width="MIN_PANEL_WIDTH"
			:max-width="MAX_PANEL_WIDTH"
			:grid-size="8"
			:style="{ width: `${panelWidth}px` }"
			@resize="onResizeThrottle"
		>
			<div :class="$style.container">
				<div :class="$style.header">
					<div :class="$style.titleRow">
						<N8nIcon icon="shield-half" :class="$style.icon" />
						<N8nText tag="h3" size="medium" bold>
							{{ i18n.baseText('securityScanner.panel.title') }}
						</N8nText>
					</div>
					<div :class="$style.headerActions">
						<N8nButton
							v-if="isAiAvailable"
							type="secondary"
							size="small"
							icon="wand-sparkles"
							data-test-id="security-analyze-ai"
							@click="onAnalyzeWithAi"
						>
							{{ i18n.baseText('securityScanner.ai.analyze' as BaseTextKey) }}
						</N8nButton>
						<N8nButton
							type="tertiary"
							size="small"
							icon="x"
							square
							data-test-id="security-panel-close"
							@click="onClose"
						/>
					</div>
				</div>

				<SecuritySummaryBar :summary="summary" />

				<div :class="$style.tabs">
					<N8nTabs v-model="selectedTab" :options="tabs" variant="modern" />
				</div>

				<div :class="$style.findings">
					<div v-if="filteredFindings.length === 0" :class="$style.emptyState">
						<N8nIcon icon="circle-check" :class="$style.emptyIcon" size="large" />
						<N8nText tag="p" size="small" color="text-light">
							{{ i18n.baseText('securityScanner.emptyState') }}
						</N8nText>
					</div>
					<SecurityFindingCard
						v-for="finding in filteredFindings"
						v-else
						:key="finding.id"
						:finding="finding"
						@navigate="onNavigateToNode"
					/>
				</div>
			</div>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	border-left: 1px solid var(--color--foreground);
	background: var(--color--background--light-3);
	height: 100%;
	overflow: hidden;
}

.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	padding: var(--spacing--sm);
	gap: var(--spacing--xs);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon {
	color: var(--color--primary);
}

.tabs {
	flex-shrink: 0;
}

.findings {
	flex: 1;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-bottom: var(--spacing--sm);
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--sm);
	text-align: center;
}

.emptyIcon {
	color: var(--color--success);
}
</style>
