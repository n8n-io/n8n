<script setup lang="ts">
import type { McpServerToolKind, McpServerToolResponse } from '@n8n/api-types';
import { N8nIcon, N8nSpinner, N8nText, N8nTooltip, type IconName } from '@n8n/design-system';
import { computed } from 'vue';

// One tool chip inside a Capabilities chip row, matching AgentChipButton in the agent builder.
const props = withDefaults(
	defineProps<{
		tool: McpServerToolResponse;
		/** AI writes the initial tool name and description. */
		drafting?: boolean;
		/** The Assistant added this tool on the latest reload. */
		highlighted?: boolean;
		/** Reasons shown in the warning tooltip when the tool needs attention. */
		warningReasons?: string[];
	}>(),
	{
		drafting: false,
		highlighted: false,
		warningReasons: () => [],
	},
);

const emit = defineEmits<{
	click: [];
}>();

const KIND_ICONS: Record<McpServerToolKind, IconName> = {
	workflow: 'workflow',
	node: 'wrench',
	agent: 'bot',
	skill: 'book-open',
};

const icon = computed<IconName>(() => KIND_ICONS[props.tool.kind]);
const hasWarning = computed(() => !props.drafting && props.warningReasons.length > 0);
</script>

<template>
	<div :class="$style.chipGroup">
		<N8nTooltip :disabled="!hasWarning" placement="top" as-child>
			<!-- Raw button: N8nButton does not support a pill chip with a truncating label and trailing warning icon. -->
			<button
				type="button"
				:class="[
					$style.chip,
					{
						[$style.warning]: hasWarning,
						[$style.highlighted]: highlighted,
					},
				]"
				data-test-id="mcp-tool-chip"
				:data-tool-name="tool.toolName"
				:data-drafting="String(drafting)"
				:data-warning="String(hasWarning)"
				:data-highlighted="String(highlighted)"
				@click="emit('click')"
			>
				<span :class="$style.iconWrapper">
					<N8nSpinner v-if="drafting" size="small" data-test-id="mcp-tool-chip-drafting" />
					<N8nIcon v-else :icon="icon" :size="16" :class="$style.icon" />
				</span>
				<N8nText size="small" color="text-dark" :class="$style.text">
					{{ tool.toolName }}
				</N8nText>
				<N8nIcon
					v-if="hasWarning"
					icon="triangle-alert"
					:size="14"
					:class="$style.warningIcon"
					data-test-id="mcp-tool-chip-warning"
				/>
			</button>
			<template #content>
				<div v-for="reason in warningReasons" :key="reason">{{ reason }}</div>
			</template>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.chipGroup {
	display: inline-flex;
	align-items: center;
	min-width: 0;
	max-width: min(var(--spacing--5xl), 100%);
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	max-width: 100%;
	height: var(--height--md);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: light-dark(var(--background--surface), var(--background--subtle));
	box-shadow: var(--shadow--xs);
	font-family: inherit;
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}

.warning {
	border-color: var(--border-color--warning);
}

.highlighted {
	animation: highlight var(--duration--slowest) ease-out;
}

@keyframes highlight {
	from {
		background-color: var(--background--success);
	}
}

.iconWrapper {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
}

.icon {
	color: var(--text-color--subtler);
}

.text {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	padding-inline-end: var(--spacing--4xs);
}

.warningIcon {
	display: block;
	flex-shrink: 0;
	color: var(--text-color--warning);
}
</style>
