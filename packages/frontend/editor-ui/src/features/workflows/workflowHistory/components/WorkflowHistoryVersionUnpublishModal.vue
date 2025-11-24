<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import type { ButtonType } from '@n8n/design-system';

import { N8nButton, N8nCallout, N8nHeading } from '@n8n/design-system';

const props = defineProps<{
	modalName: string;
	data: {
		versionName?: string;
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
				{{
					i18n.baseText('workflowHistory.action.unpublish.modal.title', {
						interpolate: { versionName: props.data.versionName || '' },
					})
				}}
			</N8nHeading>
		</template>
		<template #content>
			<N8nCallout theme="warning" icon="triangle-alert">
				{{ i18n.baseText('workflowHistory.action.unpublish.modal.description') }}
			</N8nCallout>
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
