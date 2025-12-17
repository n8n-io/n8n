<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ElDialog } from 'element-plus';
import { N8nButton, N8nCheckbox, N8nText } from '@n8n/design-system';
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

const onClose = () => {
	emit('update:modelValue', false);
	onCancel();
};
</script>

<template>
	<ElDialog
		:model-value="modelValue"
		:title="locale.baseText('settings.usageAndPlan.dialog.eula.title')"
		:before-close="onClose"
		width="540px"
		data-test-id="eula-acceptance-modal"
	>
		<template #default>
			<div>
				<N8nText color="text-base" size="medium">
					{{ locale.baseText('settings.usageAndPlan.dialog.eula.description') }}
				</N8nText>

				<N8nText :class="$style.auditNotice" color="text-base" size="medium" tag="p">
					<em>{{ locale.baseText('settings.usageAndPlan.dialog.eula.audit.notice') }}</em>
				</N8nText>

				<div :class="$style.checkboxWrapper">
					<N8nCheckbox v-model="accepted" data-test-id="eula-checkbox">
						<span>
							{{ locale.baseText('settings.usageAndPlan.dialog.eula.checkbox.label') }}
							{{ ' ' }}
							<a
								:href="eulaUrl"
								target="_blank"
								rel="noopener noreferrer"
								data-test-id="eula-link"
								>{{ locale.baseText('settings.usageAndPlan.dialog.eula.link.text') }}</a
							>.
						</span>
					</N8nCheckbox>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footerActions">
				<N8nButton type="secondary" data-test-id="eula-cancel-button" @click="onCancel">
					{{ locale.baseText('settings.usageAndPlan.dialog.eula.button.cancel') }}
				</N8nButton>
				<N8nButton
					type="primary"
					:disabled="isAcceptDisabled"
					data-test-id="eula-accept-button"
					@click="onAccept"
				>
					{{ locale.baseText('settings.usageAndPlan.dialog.eula.button.accept') }}
				</N8nButton>
			</div>
		</template>
	</ElDialog>
</template>

<style lang="scss" module>
.auditNotice {
	margin-top: var(--spacing--sm);
}

.checkboxWrapper {
	margin-top: var(--spacing--md);
}

.footerActions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
