<script lang="ts" setup>
import type { McpServerCountDto } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nLink, N8nText } from '@n8n/design-system';
import { computed, ref } from 'vue';

import { formatNumber } from '../mcpServers.utils';

const props = defineProps<{
	title: string;
	/** `note` and `details` are lines below the name. `done` replaces the button of the row. */
	items: Array<McpServerCountDto & { note?: string; done?: string; details?: string[] }>;
	emptyText: string;
	mono?: boolean;
	/** Shows a button with this label on every row. */
	actionLabel?: string;
	/** Shows a link with this label on every row. */
	selectLabel?: string;
}>();

const emit = defineEmits<{ action: [name: string]; select: [name: string] }>();

const max = computed(() => Math.max(1, ...props.items.map((item) => item.count)));

const expanded = ref(new Set<string>());

function toggle(name: string) {
	if (!expanded.value.delete(name)) expanded.value.add(name);
}
</script>

<template>
	<section :class="$style.list">
		<N8nHeading tag="h4" size="small" bold>{{ title }}</N8nHeading>
		<N8nText v-if="items.length === 0" size="small" color="text-light">{{ emptyText }}</N8nText>
		<div v-for="item in items" :key="item.name" :class="$style.row">
			<button
				type="button"
				:class="[$style.label, { [$style.mono]: mono, [$style.expanded]: expanded.has(item.name) }]"
				:title="item.name"
				:aria-expanded="expanded.has(item.name)"
				data-testid="mcp-server-bar-list-name"
				@click="toggle(item.name)"
			>
				{{ item.name }}
			</button>
			<N8nText v-for="detail in item.details" :key="detail" size="xsmall" color="text-light">
				{{ detail }}
			</N8nText>
			<div v-if="item.note || selectLabel" :class="$style.meta">
				<N8nText v-if="item.note" size="xsmall" color="text-light">{{ item.note }}</N8nText>
				<N8nLink
					v-if="selectLabel"
					size="small"
					data-testid="mcp-server-bar-list-select"
					@click="emit('select', item.name)"
				>
					{{ selectLabel }}
				</N8nLink>
			</div>
			<div :class="$style.stats">
				<div :class="$style.track">
					<div :class="$style.bar" :style="{ width: `${(item.count / max) * 100}%` }" />
				</div>
				<span :class="$style.count">{{ formatNumber(item.count) }}</span>
				<N8nText v-if="item.done" size="xsmall" color="success">{{ item.done }}</N8nText>
				<N8nButton
					v-else-if="actionLabel"
					variant="outline"
					size="xsmall"
					data-testid="mcp-server-bar-list-action"
					@click="emit('action', item.name)"
				>
					{{ actionLabel }}
				</N8nButton>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	min-width: 0;
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	min-width: 0;
}

// Two lines by default. A click shows the full text.
.label {
	all: unset;
	cursor: pointer;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	overflow-wrap: anywhere;

	&:focus-visible {
		outline: var(--border-width, 1px) solid var(--focus--outline-color);
	}
}

.expanded {
	display: block;
	-webkit-line-clamp: unset;
	line-clamp: unset;
	overflow: visible;
}

.meta,
.stats {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.mono {
	font-family: var(--font-family--monospace);
}

.track {
	flex: 1;
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	overflow: hidden;
}

.bar {
	height: 100%;
	border-radius: var(--radius--full);
	background: var(--color--secondary);
}

.count {
	color: var(--text-color--subtle);
	font-variant-numeric: tabular-nums;
}
</style>
