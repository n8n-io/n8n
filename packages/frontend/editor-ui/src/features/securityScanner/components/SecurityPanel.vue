<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { storeToRefs } from 'pinia';
import { N8nResizeWrapper, N8nTabs, N8nText, N8nIcon, N8nButton, N8nLink } from '@n8n/design-system';
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
import type { SecurityFinding } from '../scanner/types';
import SecuritySummaryBar from './SecuritySummaryBar.vue';
import SecurityFindingCard from './SecurityFindingCard.vue';

defineOptions({ name: 'SecurityPanel' });

const $style = useCssModule();
const i18n = useI18n();
const securityStore = useSecurityScannerStore();

const {
	panelWidth,
	activeTab,
	filteredFindings,
	summary,
	severityCount,
	isAiAvailable,
	hasFindings,
} = storeToRefs(securityStore);

const tabs = computed(() =>
	SECURITY_TABS.map((tab) => ({
		label: i18n.baseText(tab.labelKey as BaseTextKey),
		value: tab.value,
		tag: severityCount.value[tab.value] > 0 ? String(severityCount.value[tab.value]) : undefined,
	})),
);

const selectedTab = computed({
	get: () => activeTab.value,
	set: (val: string) => securityStore.setActiveTab(val as SecurityTab),
});

const activeTabLabel = computed(() => {
	const tab = SECURITY_TABS.find((t) => t.value === activeTab.value);
	if (!tab) return '';
	return i18n.baseText(tab.labelKey as BaseTextKey).toLowerCase();
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

function onFixFindingWithAi(finding: SecurityFinding) {
	void securityStore.fixFindingWithAi(finding);
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
					<N8nButton
						:class="$style.closeButton"
						type="tertiary"
						size="small"
						icon="x"
						square
						data-test-id="security-panel-close"
						@click="onClose"
					/>
				</div>

				<div v-if="!hasFindings" :class="$style.allClear">
					<N8nIcon icon="circle-check" color="success" :size="32" />
					<N8nText tag="h3" size="large" bold>
						{{ i18n.baseText('securityScanner.emptyState.allClear.heading' as BaseTextKey) }}
					</N8nText>
					<N8nText tag="p" size="small" color="text-light">
						{{ i18n.baseText('securityScanner.emptyState.allClear.description' as BaseTextKey) }}
					</N8nText>
				</div>

				<template v-else>
					<SecuritySummaryBar :summary="summary" />

					<div v-if="isAiAvailable" :class="$style.aiAction">
						<N8nLink
							size="small"
							data-test-id="security-analyze-ai"
							@click="onAnalyzeWithAi"
						>
							<N8nIcon icon="wand-sparkles" size="small" />
							{{ i18n.baseText('securityScanner.ai.deepScan' as BaseTextKey) }}
						</N8nLink>
					</div>

					<div :class="$style.tabs">
						<N8nTabs v-model="selectedTab" :options="tabs" variant="modern" />
					</div>

					<div :class="$style.findings">
						<div v-if="filteredFindings.length === 0" :class="$style.tabEmpty">
							<N8nIcon icon="circle-check" color="success" size="large" />
							<N8nText tag="p" size="small" color="text-light">
								{{
									i18n.baseText('securityScanner.emptyState.tabFiltered' as BaseTextKey, {
										interpolate: { category: activeTabLabel },
									})
								}}
							</N8nText>
						</div>
						<SecurityFindingCard
							v-for="finding in filteredFindings"
							v-else
							:key="finding.id"
							:finding="finding"
							:is-ai-available="isAiAvailable"
							@navigate="onNavigateToNode"
							@fix-with-ai="onFixFindingWithAi"
						/>
					</div>
				</template>
			</div>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	border-left: 1px solid light-dark(var(--color--neutral-300), var(--color--foreground));
	background: light-dark(var(--color--neutral-white), var(--color--background--light-3));
	height: 100%;
	overflow: hidden;
}

.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	gap: var(--spacing--xs);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon {
	color: light-dark(var(--color--neutral-800), var(--color--neutral-300));
}

.closeButton {
	border: none;
	background: none;

	&:hover {
		background: light-dark(var(--color--neutral-100), var(--color--neutral-800));
	}
}

.aiAction {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--sm);
}

.tabs {
	flex-shrink: 0;
	padding: 0 var(--spacing--sm);

	:global(.n8n-tabs .tabs) {
		width: 100%;
	}

	:global(.n8n-tabs .tab) {
		flex: 1;
		text-align: center;
	}
}

.findings {
	flex: 1;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	padding-left: var(--spacing--sm);
}

.allClear {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xl) var(--spacing--sm);
	text-align: center;
	flex: 1;
}

.tabEmpty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xl) var(--spacing--sm);
	text-align: center;
}
</style>
