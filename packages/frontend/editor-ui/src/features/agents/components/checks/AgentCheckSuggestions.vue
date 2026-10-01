<script setup lang="ts">
/**
 * Prepared checks not yet added, in a grey strip under the table: the only
 * place to add checks. Closed it shows how many are waiting and "Add all";
 * open it lists each with "Add", then a row to add your own.
 */
import { ref } from 'vue';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentEvalCase } from '../../agentEvals.types';
import AgentReaction from './AgentReaction.vue';

const props = defineProps<{
	suggestions: AgentEvalCase[];
	open: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	toggle: [];
	add: [suggestion: AgentEvalCase];
	addAll: [];
	addOwn: [input: string];
}>();

const i18n = useI18n();
const own = ref('');

const submitOwn = () => {
	const value = own.value.trim();
	if (!value || props.disabled) return;
	emit('addOwn', value);
	own.value = '';
};
</script>

<template>
	<div :class="[$style.strip, { [$style.open]: open }]" data-testid="agent-check-suggestions">
		<div
			:class="$style.head"
			role="button"
			tabindex="0"
			:aria-expanded="open"
			data-testid="agent-check-suggestions-toggle"
			@click="emit('toggle')"
			@keydown.enter.prevent="emit('toggle')"
			@keydown.space.prevent="emit('toggle')"
		>
			<span v-if="suggestions.length" :class="$style.faces">
				<AgentReaction
					v-for="i in Math.min(3, suggestions.length)"
					:key="i"
					kind="idle"
					size="xs"
				/>
			</span>
			<span :class="$style.label">
				{{
					suggestions.length
						? i18n.baseText('agents.builder.agentChecks.suggestions.count', {
								adjustToNumber: suggestions.length,
								interpolate: { count: String(suggestions.length) },
							})
						: i18n.baseText('agents.builder.agentChecks.suggestions.ownTitle')
				}}
			</span>
			<N8nButton
				v-if="suggestions.length"
				variant="outline"
				size="small"
				:disabled="disabled"
				data-testid="agent-check-suggestions-add-all"
				@click.stop="emit('addAll')"
			>
				{{
					i18n.baseText('agents.builder.agentChecks.suggestions.addAll', {
						interpolate: { count: String(suggestions.length) },
					})
				}}
			</N8nButton>
			<N8nIcon :icon="open ? 'chevron-up' : 'chevron-down'" size="small" :class="$style.chev" />
		</div>
		<div v-if="open" :class="$style.list">
			<div v-for="suggestion in suggestions" :key="suggestion.rowId" :class="$style.row">
				<AgentReaction kind="idle" size="row" />
				<span :class="$style.kind">{{ suggestion.kind }}</span>
				<span :class="$style.prompt">{{ suggestion.input }}</span>
				<N8nButton
					variant="ghost"
					size="small"
					:disabled="disabled"
					data-testid="agent-check-suggestion-add"
					@click="emit('add', suggestion)"
				>
					{{ i18n.baseText('agents.builder.agentChecks.suggestions.add') }}
				</N8nButton>
			</div>
			<label :class="[$style.row, $style.ownRow]">
				<AgentReaction kind="idle" size="row" />
				<span :class="$style.kind">{{
					i18n.baseText('agents.builder.agentChecks.suggestions.custom')
				}}</span>
				<input
					v-model="own"
					:class="$style.ownInput"
					type="text"
					:disabled="disabled"
					:placeholder="i18n.baseText('agents.builder.agentChecks.suggestions.own')"
					data-testid="agent-check-suggestion-own"
					@keydown.enter.prevent="submitOwn"
				/>
			</label>
		</div>
	</div>
</template>

<style lang="scss" module>
.strip {
	border-radius: var(--radius--lg);
	background: var(--background--subtle);
}

.head {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-height: var(--height--3xl);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-radius: var(--radius--lg);
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: -2px;
	}
}

.faces {
	display: inline-flex;

	> * + * {
		margin-left: calc(-1 * var(--spacing--3xs));
	}
}

.label {
	flex: 1;
	min-width: 0;
}

.chev {
	color: var(--text-color--subtler);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--2xs) var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);
	background: var(--background--surface);
	font-size: var(--font-size--sm);
}

.kind {
	flex-shrink: 0;
	max-width: 38%;
	overflow: hidden;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.prompt {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.ownRow {
	cursor: text;

	&:focus-within {
		border-color: var(--color--primary);
	}
}

.ownInput {
	flex: 1;
	min-width: 0;
	border: 0;
	outline: 0;
	background: transparent;
	font: inherit;
	color: var(--text-color);

	&::placeholder {
		color: var(--text-color--subtler);
	}
}
</style>
