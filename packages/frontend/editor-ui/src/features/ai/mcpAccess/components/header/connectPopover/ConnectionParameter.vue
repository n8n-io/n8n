<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useClipboard } from '@/app/composables/useClipboard';
import { N8nButton, N8nTooltip, N8nInfoTip, N8nInput, N8nLoading } from '@n8n/design-system';
import { MCP_TOOLTIP_DELAY } from '@/features/ai/mcpAccess/mcp.constants';

type Props = {
	id: string;
	label: string;
	value: string;
	valueLoading?: boolean;
	infoTip?: string;
	allowCopy?: boolean;
};

const { copy, copied, isSupported } = useClipboard();
const i18n = useI18n();

const props = withDefaults(defineProps<Props>(), {
	allowCopy: true,
	maxWidth: undefined,
	infoTip: undefined,
	valueLoading: false,
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
	<div :class="$style.container">
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
			:class="{
				[$style['parameter-value']]: true,
				[$style['parameter-value--loading']]: props.valueLoading,
			}"
			data-test-id="connection-parameter-value"
		>
			<div :class="$style['input-wrapper']">
				<N8nLoading
					v-if="props.valueLoading"
					:loading="props.valueLoading"
					variant="h1"
					:class="$style['parameter-skeleton']"
				/>
				<N8nInput v-else v-model="props.value" type="text" :readonly="true" />
			</div>
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
						:disabled="props.valueLoading"
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

	&--loading {
		gap: 0;
	}

	.input-wrapper {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
	}

	:global(.n8n-input) {
		flex: 1;
		align-items: center;

		input {
			font-family: monospace;
			font-size: var(--font-size--2xs);
			border: none;
			color: var(--color--text);
			min-height: var(--spacing--md);
			height: var(--spacing--md);
		}
	}

	.parameter-skeleton div {
		margin: 0;
		height: calc(var(--spacing--xl) - 2 * var(--border-width));
		border-radius: 0 0 var(--radius) var(--radius);
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
