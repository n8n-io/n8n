<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nCheckbox, N8nText } from '@n8n/design-system';
import {
	N8nDialog,
	N8nDialogClose,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
} from '@n8n/design-system/components/N8nDialog';
import { useUsersStore } from '@/features/settings/users/users.store';

const props = defineProps<{
	open: boolean;
	serviceName: string;
	consentText: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();
const usersStore = useUsersStore();

const consentChecked = ref(false);

const userEmail = usersStore.currentUser?.email ?? '';

// Reset checkbox when dialog opens
watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			consentChecked.value = false;
		}
	},
);

function onCancel() {
	emit('cancel');
	emit('update:open', false);
}

function onConfirm() {
	emit('confirm');
	emit('update:open', false);
}
</script>

<template>
	<N8nDialog :open="open" size="medium" @update:open="emit('update:open', $event)">
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText('quickConnect.consent.title', { interpolate: { serviceName } }) }}
			</N8nDialogTitle>
			<N8nDialogDescription>
				{{ i18n.baseText('quickConnect.consent.description', { interpolate: { serviceName } }) }}
			</N8nDialogDescription>
		</N8nDialogHeader>

		<div :class="$style.body">
			<br />
			<N8nText bold>{{ userEmail }}</N8nText>
			<N8nCheckbox v-model="consentChecked">
				<template #label>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<span v-html="consentText" />
				</template>
			</N8nCheckbox>
		</div>

		<N8nDialogFooter>
			<N8nDialogClose as-child>
				<N8nButton
					variant="outline"
					:label="i18n.baseText('quickConnect.consent.cancel')"
					@click="onCancel"
				/>
			</N8nDialogClose>
			<N8nButton
				:label="i18n.baseText('quickConnect.consent.confirm')"
				:disabled="!consentChecked"
				@click="onConfirm"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
