<script lang="ts" setup>
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants/modals';

const props = withDefaults(
	defineProps<{
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	remove: [];
}>();

const i18n = useI18n();
const message = useMessage();

async function handleRemove() {
	const confirmAction = await message.confirm(
		i18n.baseText('settings.sso.settings.roleMappingRules.removeMapping.confirm.message'),
		i18n.baseText('settings.sso.settings.roleMappingRules.removeMapping.confirm.title'),
		{
			confirmButtonText: i18n.baseText(
				'settings.sso.settings.roleMappingRules.removeMapping.confirm.confirm',
			),
			cancelButtonText: i18n.baseText(
				'settings.sso.settings.roleMappingRules.removeMapping.confirm.cancel',
			),
		},
	);
	if (confirmAction === MODAL_CONFIRM) {
		emit('remove');
	}
}
</script>
<template>
	<div :class="$style.container">
		<N8nButton
			type="tertiary"
			size="medium"
			:disabled="props.disabled"
			data-test-id="remove-mapping-button"
			@click="handleRemove"
		>
			{{ i18n.baseText('settings.sso.settings.roleMappingRules.removeMapping.button') }}
		</N8nButton>
	</div>
</template>
<style lang="scss" module>
.container {
	padding: var(--spacing--lg) 0 0;
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	margin-top: var(--spacing--lg);
}
</style>
