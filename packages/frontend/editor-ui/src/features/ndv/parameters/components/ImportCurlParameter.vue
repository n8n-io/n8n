<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import {
	canMakeHttpActions,
	HTTP_ACTION_VIEW,
	httpActionFormOfRequest,
	saveHttpActionDraft,
} from '@n8n/frontend-module-next-nodes-instance';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { IMPORT_CURL_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

import { N8nButton, N8nTooltip } from '@n8n/design-system';
const props = defineProps<{
	isReadOnly?: boolean;
	/** The parameters of the HTTP Request node, for "Save as action". */
	nodeValues?: Readonly<Record<string, unknown>>;
}>();

const uiStore = useUIStore();
const i18n = useI18n();

function onImportCurlClicked() {
	uiStore.openModal(IMPORT_CURL_MODAL_KEY);
}

const router = useRouter();
const canSaveAsAction = computed(() => canMakeHttpActions());

// A new tab keeps the workflow open while the user finishes the action.
function onSaveAsActionClicked() {
	saveHttpActionDraft(httpActionFormOfRequest(props.nodeValues ?? {}));
	window.open(router.resolve({ name: HTTP_ACTION_VIEW }).href, '_blank');
}
</script>

<template>
	<div :class="$style.importSection">
		<N8nTooltip
			v-if="canSaveAsAction"
			:content="i18n.baseText('settings.nodes.saveAsAction.tooltip')"
		>
			<N8nButton
				variant="subtle"
				:label="i18n.baseText('settings.nodes.saveAsAction')"
				size="xsmall"
				data-test-id="http-request-save-as-action"
				@click="onSaveAsActionClicked"
			/>
		</N8nTooltip>
		<N8nButton
			variant="subtle"
			:label="i18n.baseText('importCurlParameter.label')"
			:disabled="isReadOnly"
			size="xsmall"
			@click="onImportCurlClicked"
		/>
	</div>
</template>

<style module lang="scss">
.importSection {
	display: flex;
	flex-direction: row-reverse;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}
</style>
