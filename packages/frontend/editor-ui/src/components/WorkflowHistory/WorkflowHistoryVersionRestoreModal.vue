<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import Modal from '@/components/Modal.vue';
import { useUIStore } from '@/stores/ui.store';
import type { ButtonType } from '@n8n/design-system';
import { I18nT } from 'vue-i18n';

import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
const props = defineProps<{
	modalName: string;
	data: {
		isWorkflowActivated: boolean;
		formattedCreatedAt: string;
		beforeClose: () => void;
		buttons: Array<{
			text: string;
			type: ButtonType;
			action: () => void;
		}>;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};
</script>

<template>
	<Modal width="500px" :name="props.modalName" :before-close="props.data.beforeClose">
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{ i18n.baseText('workflowHistory.action.restore.modal.title') }}
			</N8nHeading>
		</template>
		<template #content>
			<div>
				<N8nText>
					<I18nT keypath="workflowHistory.action.restore.modal.subtitle" tag="span" scope="global">
						<template #date>
							<strong>{{ props.data.formattedCreatedAt }}</strong>
						</template>
					</I18nT>
					<br />
					<br />
					<I18nT
						v-if="props.data.isWorkflowActivated"
						keypath="workflowHistory.action.restore.modal.text"
						tag="span"
						scope="global"
					>
						<template #buttonText>
							&ldquo;{{
								i18n.baseText('workflowHistory.action.restore.modal.button.deactivateAndRestore')
							}}&rdquo;
						</template>
					</I18nT>
				</N8nText>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-for="(button, index) in props.data.buttons"
					:key="index"
					size="medium"
					:type="button.type"
					@click="
						() => {
							button.action();
							closeModal();
						}
					"
				>
					{{ button.text }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;

	button {
		margin-left: var(--spacing--2xs);
	}
}
</style>
