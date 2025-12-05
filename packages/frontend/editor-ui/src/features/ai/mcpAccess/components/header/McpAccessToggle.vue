<script setup lang="ts">
import { ElSwitch } from 'element-plus';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

type Props = {
	modelValue: boolean;
	disabled?: boolean;
	loading?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	loading: false,
});

const emit = defineEmits<{
	disableMcpAccess: [];
}>();

const i18n = useI18n();

const onUpdateMCPEnabled = () => {
	emit('disableMcpAccess');
};
</script>

<template>
	<div :class="$style['main-toggle-container']">
		<div :class="$style['main-toggle-info']">
			<N8nText :bold="true" :color="modelValue ? `success` : `text-light`">
				{{
					modelValue
						? i18n.baseText('settings.mcp.header.toggle.enabled')
						: i18n.baseText('settings.mcp.header.toggle.disabled')
				}}
			</N8nText>
		</div>
		<div :class="$style['main-toggle']" data-test-id="mcp-toggle-container">
			<N8nTooltip
				:content="i18n.baseText('settings.mcp.toggle.disabled.tooltip')"
				:disabled="!props.disabled"
				placement="top"
			>
				<ElSwitch
					size="large"
					data-test-id="mcp-access-toggle"
					:model-value="props.modelValue"
					:disabled="props.disabled"
					:loading="props.loading"
					@update:model-value="onUpdateMCPEnabled"
				/>
			</N8nTooltip>
		</div>
	</div>
</template>

<style module lang="scss">
.main-toggle-container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.main-toggle {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}
</style>
