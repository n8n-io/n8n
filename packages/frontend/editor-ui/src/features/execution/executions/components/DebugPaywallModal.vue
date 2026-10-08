<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
const props = defineProps<{
	modalName: string;
	data: { title: string; footerButtonAction: () => void };
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:header="props.data.title"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<N8nText>
				{{ i18n.baseText('executionsList.debug.paywall.content') }}
				<br />
				<br />
				{{ i18n.baseText('executionsList.debug.paywall.subContent') }}
				<N8nLink :to="i18n.baseText('executionsList.debug.paywall.link.url')" new-window>
					{{ i18n.baseText('executionsList.debug.paywall.link.text') }}
				</N8nLink>
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.footer">
				<N8nButton @click="props.data.footerButtonAction">
					{{ i18n.baseText('generic.seePlans') }}
				</N8nButton>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}
</style>
