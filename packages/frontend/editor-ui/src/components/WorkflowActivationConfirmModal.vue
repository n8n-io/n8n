<script setup lang="ts">
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from '@/components/Modal.vue';
import { WORKFLOW_ACTIVATION_CONFIRM_MODAL_KEY } from '@/constants';
import { useUIStore } from '@/stores/ui.store';

import type { IHttpRequestMethods } from 'n8n-workflow';
import { useRootStore } from '@/stores/root.store';
import { computed } from 'vue';

const modalBus = createEventBus();
const uiStore = useUIStore();
const rootStore = useRootStore();

const props = defineProps<{
	data: {
		triggerName: string;
		workflowName: string;
		workflowId: string;
		webhookPath: string;
		method: IHttpRequestMethods;
		node: string;
	};
}>();

const { data } = props;

const workflowUrl = computed(() => {
	return rootStore.urlBaseEditor + 'workflow/' + data.workflowId;
});

const onClick = async () => {
	uiStore.closeModal(WORKFLOW_ACTIVATION_CONFIRM_MODAL_KEY);
};
</script>

<template>
	<Modal
		width="540px"
		:name="WORKFLOW_ACTIVATION_CONFIRM_MODAL_KEY"
		title="Conflicting Webhook Path"
		:event-bus="modalBus"
		:center="true"
	>
		<template #content>
			<div :class="[$style.descriptionContainer, 'p-s']">
				<div>
					<n8n-text>
						Node <strong>{{ data.node }}</strong> in the workflow
					</n8n-text>
					<n8n-link :to="workflowUrl">
						<strong>{{ data.workflowName }} </strong>
					</n8n-link>
					<n8n-text>
						shares the same path <code>'{{ data.webhookPath }}'</code> as
						<strong>{{ data.triggerName }} </strong> node in this workflow. Please update the path
						to be unique or deactivate the conflicting workflow.
					</n8n-text>
				</div>
			</div>
		</template>
		<template #footer>
			<n8n-button
				label="Close"
				size="large"
				float="right"
				data-test-id="close-button"
				@click="onClick"
			/>
		</template>
	</Modal>
</template>

<style module lang="scss">
.descriptionContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border: var(--border-width-base) var(--border-style-base) var(--color-info-tint-1);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-light);

	button {
		& > span {
			flex-direction: row-reverse;
			& > span {
				margin-left: var(--spacing-3xs);
			}
		}
	}
}

.formContainer {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-regular);
	color: var(--color-text-base);
}

.checkbox {
	span:nth-child(2) {
		vertical-align: text-top;
	}
}

.error {
	color: var(--color-danger);

	span {
		border-color: var(--color-danger);
	}
}
</style>

<style lang="scss">
.el-tooltip__popper {
	max-width: 240px;
	img {
		width: 100%;
	}
	p {
		line-height: 1.2;
	}
	p + p {
		margin-top: var(--spacing-2xs);
	}
}
</style>
