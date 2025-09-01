<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import { NODE_VERSION_UPDATE_MODAL_KEY } from '@/constants';

import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';

import { N8nText } from '@n8n/design-system';
import { useUIStore } from '@/stores/ui.store';
import { computed, ref } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';
import { useExternalHooks } from '@/composables/useExternalHooks';

const modalBus = createEventBus();

const i18n = useI18n();
const ndvStore = useNDVStore();
const externalHooks = useExternalHooks();

const nodeName = computed(() => ndvStore.activeNode?.name ?? '');

const loading = ref(false);

const onConfirmButtonClick = async () => {
	loading.value = true;
	console.log('confirm'); // TODO implement
	await closeNdv();
	loading.value = false;

	useUIStore().closeModal(NODE_VERSION_UPDATE_MODAL_KEY);
};

const onCancelButtonClick = async () => {
	useUIStore().closeModal(NODE_VERSION_UPDATE_MODAL_KEY);
};

const closeNdv = async () => {
	await externalHooks.run('dataDisplay.nodeEditingFinished');

	ndvStore.unsetActiveNodeName();
	ndvStore.resetNDVPushRef();
};
</script>

<template>
	<Modal
		width="540px"
		:name="NODE_VERSION_UPDATE_MODAL_KEY"
		:title="`Update ${nodeName} node to the latest version`"
		:event-bus="modalBus"
		:center="true"
		:show-close="true"
	>
		<template #content>
			<N8nText v-if="false" size="medium" color="text-dark" :bold="true">message</N8nText>
			<n8n-notice content="Make sure to test the node after updating its version!" />
			<div :class="$style.descriptionContainer">
				<N8nText size="medium" color="text-base">
					<div class="descriptionText">
						<p>This view will close, and the node will be updated to the latest version</p>
						<p>The old version of the node will remain available in the workflow for reference.</p>
						<p>
							New version could not have corresponding resource and operation and some parameters
							may require manual adjustments.
						</p>
						<p>
							Due to logic changes, the node's output data may differ from the previous version.
						</p>
					</div>
				</N8nText>
			</div>
		</template>
		<template #footer>
			<n8n-button
				:label="i18n.baseText('settings.communityNodes.confirmModal.cancel')"
				size="large"
				float="left"
				type="secondary"
				@click="onCancelButtonClick"
			/>
			<n8n-button
				:loading="loading"
				:disabled="loading"
				label="Confirm"
				size="large"
				float="right"
				@click="onConfirmButtonClick"
			/>
		</template>
	</Modal>
</template>

<style module lang="scss">
.descriptionContainer {
	display: flex;
	margin: var(--spacing-s) 0;
	flex-direction: column;
}

.descriptionText {
	padding: 0 var(--spacing-xs);
}
</style>
