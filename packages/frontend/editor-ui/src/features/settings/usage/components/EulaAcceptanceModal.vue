<script lang="ts" setup>
import { computed, ref } from 'vue';
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nText,
} from '@n8n/design-system';
import { i18n as locale } from '@n8n/i18n';

interface Props {
	modelValue: boolean;
	eulaUrl: string;
}

defineProps<Props>();
const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	accept: [];
	cancel: [];
}>();

const accepted = ref(false);
const isAcceptDisabled = computed(() => !accepted.value);

const onCancel = () => {
	accepted.value = false;
	emit('cancel');
};

const onAccept = () => {
	emit('accept');
};

const onDialogOpenUpdate = (open: boolean) => {
	if (open) return;
	emit('update:modelValue', false);
	onCancel();
};
</script>

<template>
	<N8nDialog
		:open="modelValue"
		size="large"
		:header="locale.baseText('settings.usageAndPlan.dialog.eula.title')"
		data-test-id="eula-acceptance-modal"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<N8nText color="text-base" size="medium">
				{{ locale.baseText('settings.usageAndPlan.dialog.eula.description') }}
			</N8nText>

			<N8nText :class="$style.auditNotice" color="text-base" size="medium" tag="p">
				<em>{{ locale.baseText('settings.usageAndPlan.dialog.eula.audit.notice') }}</em>
			</N8nText>

			<div :class="$style.checkboxWrapper">
				<N8nCheckbox v-model="accepted" data-test-id="eula-checkbox">
					<template #label>
						<span>
							{{ locale.baseText('settings.usageAndPlan.dialog.eula.checkbox.label') }}
							{{ ' ' }}
							<a :href="eulaUrl" target="_blank" rel="noopener noreferrer" data-test-id="eula-link">
								{{ locale.baseText('settings.usageAndPlan.dialog.eula.link.text') }} </a
							>.
						</span>
					</template>
				</N8nCheckbox>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="subtle" data-test-id="eula-cancel-button" @click="onCancel">
				{{ locale.baseText('settings.usageAndPlan.dialog.eula.button.cancel') }}
			</N8nButton>
			<N8nButton
				variant="solid"
				:disabled="isAcceptDisabled"
				data-test-id="eula-accept-button"
				@click="onAccept"
			>
				{{ locale.baseText('settings.usageAndPlan.dialog.eula.button.accept') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.auditNotice {
	margin-top: var(--spacing--sm);
}

.checkboxWrapper {
	margin-top: var(--spacing--md);
}
</style>
