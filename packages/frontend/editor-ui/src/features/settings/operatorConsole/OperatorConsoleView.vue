<script setup lang="ts">
import type { OperatorLogFilter } from '@n8n/api-types';
import { computed, onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nCallout, N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePushConnection } from '@/app/composables/usePushConnection';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

import OperatorConsoleFilterBar from './components/OperatorConsoleFilterBar.vue';
import OperatorConsoleLogList from './components/OperatorConsoleLogList.vue';
import OperatorConsoleToolbar from './components/OperatorConsoleToolbar.vue';
import { useOperatorConsoleStore } from './operatorConsole.store';
import { downloadTextFile, recordsFromEntries, toJsonl } from './operatorConsole.utils';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const pushConnection = usePushConnection({ router });
const pushStore = usePushConnectionStore();
const store = useOperatorConsoleStore();

const pageTitle = computed(() => i18n.baseText('operatorConsole.title'));

/** `?executionId=` is the deep link from execution detail's "View logs" action. */
function initialFilter(): OperatorLogFilter {
	const executionId = route.query.executionId;
	return typeof executionId === 'string' && executionId !== '' ? { executionId } : {};
}

onBeforeMount(() => {
	pushConnection.initialize();
	pushStore.pushConnect();
	void store.start(initialFilter());
});

onMounted(() => {
	documentTitle.set(pageTitle.value);
});

onBeforeUnmount(() => {
	void store.stop();
	pushStore.pushDisconnect();
	pushConnection.terminate();
});

function onFilterChange(patch: Partial<OperatorLogFilter>) {
	void store.updateFilter(patch);
}

function onDownload() {
	const records = recordsFromEntries(store.entries);
	if (records.length === 0) return;

	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	downloadTextFile(toJsonl(records), `n8n-operator-console-${stamp}.jsonl`, 'application/jsonl');
}
</script>

<template>
	<N8nSettingsLayout full-width data-test-id="operator-console-view">
		<N8nSettingsPageHeader
			:title="pageTitle"
			:description="i18n.baseText('operatorConsole.description')"
			:show-docs-link="false"
			:class="$style.header"
		/>

		<N8nCallout
			v-if="store.lastError"
			theme="danger"
			:class="$style.callout"
			data-test-id="operator-console-error"
		>
			{{ i18n.baseText('operatorConsole.error.title') }} — {{ store.lastError }}
		</N8nCallout>

		<div :class="$style.console">
			<OperatorConsoleFilterBar
				:filter="store.filter"
				:hosts="store.hostOptions"
				:scopes="store.scopeOptions"
				:disabled="store.isLoading"
				@change="onFilterChange"
			/>
			<OperatorConsoleToolbar
				:connection-state="store.connectionState"
				:is-paused="store.isPaused"
				:follow-tail="store.followTail"
				:record-count="store.recordCount"
				:dropped-total="store.droppedTotal"
				:paused-line-count="store.pausedLineCount"
				:can-download="store.recordCount > 0"
				@toggle-pause="store.togglePause"
				@toggle-follow="store.setFollowTail(!store.followTail)"
				@download="onDownload"
				@clear="store.clearBuffer"
			/>
			<OperatorConsoleLogList
				:entries="store.entries"
				:follow-tail="store.followTail"
				@update:follow-tail="store.setFollowTail"
			/>
		</div>
	</N8nSettingsLayout>
</template>

<style module lang="scss">
/*
 * The settings page header caps itself at the content max-width and is centred
 * by the layout. On a full-width page that leaves a narrow, centred heading
 * floating over a much wider panel, reading as misaligned. Align it to the
 * panel's left edge instead — the description still wraps at a readable
 * measure, it just no longer sits in the middle of the page.
 */
/* Class doubled to outrank the component's own single-class rule regardless of
 * stylesheet order, without reaching for `!important`. */
.header.header {
	max-width: none;
	margin-inline: 0;
}

.callout {
	width: 100%;
}

.console {
	/* The pane is a viewport-anchored terminal, not a growing document. */
	--operator-console--height: 65vh;

	display: flex;
	flex-direction: column;
	width: 100%;
	height: var(--operator-console--height);
	min-height: 20rem;
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
}
</style>
