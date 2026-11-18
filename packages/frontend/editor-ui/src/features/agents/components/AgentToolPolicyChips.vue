<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { ToolPolicyChip } from '../utils/tool-policy-picker';

defineProps<{
	chips: ToolPolicyChip[];
	/** Shows a remove control on each chip. */
	removable?: boolean;
}>();

const emit = defineEmits<{ remove: [chip: ToolPolicyChip] }>();

const i18n = useI18n();

/** For the chip of an MCP server: how many of its tools the chip stands for. */
function serverDetail(server: NonNullable<ToolPolicyChip['server']>): string {
	if (server === 'all') return i18n.baseText('agents.toolPolicy.picker.server.all');
	// The list of the server is not loaded, so the total is not known.
	if (server.total === 0) {
		return i18n.baseText('agents.toolPolicy.picker.server.count', {
			adjustToNumber: server.selected,
			interpolate: { count: server.selected },
		});
	}
	return i18n.baseText('agents.toolPolicy.picker.server.some', {
		interpolate: { count: server.selected, total: server.total },
	});
}
</script>

<template>
	<span :class="$style.chips">
		<span
			v-for="chip in chips"
			:key="chip.id"
			:class="$style.chip"
			data-testid="agent-tool-policy-chip"
		>
			<span :class="$style.label">{{ chip.label }}</span>
			<span v-if="chip.server" :class="$style.detail">· {{ serverDetail(chip.server) }}</span>
			<button
				v-if="removable"
				type="button"
				:class="$style.remove"
				:aria-label="
					i18n.baseText('agents.toolPolicy.picker.remove', { interpolate: { name: chip.label } })
				"
				data-testid="agent-tool-policy-chip-remove"
				@click.stop="emit('remove', chip)"
			>
				<N8nIcon icon="x" size="xsmall" />
			</button>
		</span>
	</span>
</template>

<style lang="scss" module>
// The chips take part in the layout of the element around them.
.chips {
	display: contents;
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 100%;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius);
	background: var(--color--background--light-2);
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.detail {
	flex: none;
	color: var(--text-color--subtler);
	white-space: nowrap;
}

.remove {
	display: inline-flex;
	flex: none;
	padding: 0;
	border: 0;
	background: none;
	color: var(--text-color--subtler);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}
}
</style>
