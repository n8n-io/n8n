<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useClipboard } from '@/app/composables/useClipboard';
import { N8nButton, N8nTooltip, N8nInfoTip } from '@n8n/design-system';
import { MCP_TOOLTIP_DELAY } from '@/features/ai/mcpAccess/mcp.constants';

type Props = {
	id: string;
	label: string;
	value: string;
	infoTip?: string;
	allowCopy?: boolean;
	maxWidth?: number;
};

const { copy, copied, isSupported } = useClipboard();
const i18n = useI18n();

const props = withDefaults(defineProps<Props>(), {
	allowCopy: true,
	maxWidth: undefined,
	infoTip: undefined,
});

const emit = defineEmits<{
	copy: [value: string];
}>();

const handleCopy = async (value: string) => {
	await copy(value);
	emit('copy', value);
};
</script>

<template>
	<div
		:class="$style.container"
		:style="{ maxWidth: props.maxWidth ? props.maxWidth + 'px' : 'none' }"
	>
		<div :class="$style['label-wrapper']">
			<label :class="$style.label" :for="`connection-parameter-${props.id}`">
				{{ props.label }}
			</label>
			<div v-if="props.infoTip" :class="$style['info-tip']">
				<N8nInfoTip type="tooltip" size="small">
					{{ props.infoTip }}
				</N8nInfoTip>
			</div>
		</div>
		<div
			:id="`connection-parameter-${props.id}`"
			:class="$style['parameter-value']"
			data-test-id="connection-parameter-value"
		>
			<code>{{ props.value }}</code>
			<div :class="$style['copy-button-wrapper']">
				<slot name="customActions" />
				<N8nTooltip
					:disabled="!isSupported"
					:content="copied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy')"
					:show-after="MCP_TOOLTIP_DELAY"
					placement="bottom"
				>
					<N8nButton
						v-if="props.allowCopy && isSupported"
						type="tertiary"
						:icon="copied ? 'check' : 'copy'"
						:square="true"
						:class="$style['copy-button']"
						@click="handleCopy(props.value)"
					/>
				</N8nTooltip>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.label-wrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);

	.info-tip {
		display: none;
		cursor: pointer;
	}

	&:hover .info-tip {
		display: block;
	}
}

.label {
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
}

.parameter-value {
	display: flex;
	align-items: stretch;
	justify-content: space-between;
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	gap: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;

	code {
		display: flex;
		align-items: center;
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: pre;
		padding: var(--spacing--2xs);
	}

	button {
		border: none;
		border-radius: 0;

		&:hover {
			border-color: inherit;
		}
	}

	button + button {
		border-left: var(--border);
	}

	@media screen and (max-width: 820px) {
		word-wrap: break-word;
		margin-top: var(--spacing--2xs);
	}
}

.copy-button-wrapper {
	display: flex;
	align-items: center;
	border-left: var(--border);
}

.copy-button {
	border: none;
	border-radius: 0;
}
</style>
