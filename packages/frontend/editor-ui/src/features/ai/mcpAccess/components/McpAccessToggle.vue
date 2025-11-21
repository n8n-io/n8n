<script setup lang="ts">
import { ElSwitch } from 'element-plus';
import { N8nLink, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';

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
	toggleMcpAccess: [enabled: boolean];
}>();

const i18n = useI18n();

const onUpdateMCPEnabled = (value: string | number | boolean) => {
	const boolValue = typeof value === 'boolean' ? value : Boolean(value);
	emit('toggleMcpAccess', boolValue);
};
</script>

<template>
	<div :class="$style['mcp-access-toggle']">
		<div :class="$style['main-toggle-container']">
			<div :class="$style['main-toggle-info']">
				<N8nText :bold="true">{{ i18n.baseText('settings.mcp.toggle.label') }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.mcp.toggle.description') }}
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
		<div v-if="!props.modelValue" :class="$style['toggle-notice']">
			<N8nText color="text-base" data-test-id="mcp-toggle-disabled-notice">
				{{ i18n.baseText('settings.mcp.toggle.disabled.notice') }}
			</N8nText>
			<N8nLink :to="MCP_DOCS_PAGE_URL" :new-window="true">
				{{ i18n.baseText('generic.learnMore') }}
			</N8nLink>
		</div>
	</div>
</template>

<style module lang="scss">
.mcp-access-toggle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.main-toggle-container {
	display: flex;
	align-items: center;
	padding: var(--spacing--sm);
	justify-content: space-between;
	flex-shrink: 0;

	border-radius: var(--radius);
	border: var(--border);
}

.main-toggle-info {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
}

.main-toggle {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.toggle-notice {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
