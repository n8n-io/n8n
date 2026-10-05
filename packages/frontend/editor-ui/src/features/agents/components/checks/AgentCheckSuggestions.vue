<script setup lang="ts">
/**
 * "Add a check" under the list: closed, one quiet dashed row (with how many
 * prepared checks are ready); open, one section for both ways in. The input
 * takes a rule of your own; under it, the checks we prepared are examples to
 * start from. Both add with the same button. Three prepared checks show; the
 * rest open in place.
 */
import { computed, ref } from 'vue';
import { N8nButton, N8nIconButton, N8nInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentEvalCase } from '../../agentEvals.types';
import AgentReaction from './AgentReaction.vue';

const VISIBLE = 3;

const props = defineProps<{
	suggestions: AgentEvalCase[];
	open: boolean;
	disabled?: boolean;
	/** An example is being written for the rule the user just added. */
	writing?: boolean;
}>();

const emit = defineEmits<{
	toggle: [];
	add: [suggestion: AgentEvalCase];
	addOwn: [rule: string];
}>();

const i18n = useI18n();
const own = ref('');
const expanded = ref(false);

const shown = computed(() =>
	props.open ? props.suggestions : props.suggestions.slice(0, VISIBLE),
);
const hidden = computed(() => Math.max(0, props.suggestions.length - VISIBLE));

const submitOwn = () => {
	const value = own.value.trim();
	if (!value || props.disabled || props.writing) return;
	emit('addOwn', value);
	own.value = '';
};
</script>

<template>
	<!-- Closed: the Agent tab's add pattern (a ghost button in the lighter text colour). -->
	<div v-if="!expanded && !writing">
		<N8nButton
			variant="ghost"
			size="medium"
			icon="plus"
			:class="$style.opener"
			:disabled="disabled"
			data-testid="agent-check-add-open"
			@click="expanded = true"
		>
			{{ i18n.baseText('agents.builder.agentChecks.suggestions.openAdd') }}
			<span v-if="suggestions.length" :class="$style.ready">{{
				i18n.baseText('agents.builder.agentChecks.suggestions.ready', {
					interpolate: { count: String(suggestions.length) },
				})
			}}</span>
		</N8nButton>
	</div>
	<section v-else :class="$style.add" data-testid="agent-check-suggestions">
		<div :class="$style.head">
			<b :class="$style.title">{{
				i18n.baseText('agents.builder.agentChecks.suggestions.title')
			}}</b>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('agents.builder.agentChecks.suggestions.close')"
				data-testid="agent-check-add-close"
				@click="expanded = false"
			/>
		</div>

		<N8nInput
			v-model="own"
			autofocus
			:disabled="disabled || writing"
			:aria-label="i18n.baseText('agents.builder.agentChecks.suggestions.title')"
			:placeholder="
				writing
					? i18n.baseText('agents.builder.agentChecks.suggestions.writing')
					: i18n.baseText('agents.builder.agentChecks.suggestions.own')
			"
			data-testid="agent-check-suggestion-own"
			@keydown.enter.prevent="submitOwn"
		>
			<template #suffix>
				<N8nButton
					variant="outline"
					size="small"
					:disabled="disabled || !own.trim()"
					:loading="writing"
					data-testid="agent-check-own-add"
					@click="submitOwn"
				>
					{{ i18n.baseText('agents.builder.agentChecks.suggestions.add') }}
				</N8nButton>
			</template>
		</N8nInput>

		<template v-if="suggestions.length">
			<span :class="$style.label">{{
				i18n.baseText('agents.builder.agentChecks.suggestions.prepared')
			}}</span>
			<div :class="$style.list">
				<div v-for="suggestion in shown" :key="suggestion.rowId" :class="$style.row">
					<AgentReaction kind="idle" size="sm" />
					<span :class="$style.text">
						<span :class="$style.kind">{{ suggestion.kind }}</span>
						<span :class="$style.prompt">{{ suggestion.input }}</span>
					</span>
					<N8nButton
						variant="outline"
						size="small"
						:disabled="disabled"
						data-testid="agent-check-suggestion-add"
						@click="emit('add', suggestion)"
					>
						{{ i18n.baseText('agents.builder.agentChecks.suggestions.add') }}
					</N8nButton>
				</div>
			</div>
			<div v-if="hidden > 0">
				<N8nButton
					variant="ghost"
					size="small"
					:icon="open ? 'chevron-up' : 'chevron-down'"
					data-testid="agent-check-suggestions-toggle"
					@click="emit('toggle')"
				>
					{{
						open
							? i18n.baseText('agents.builder.agentChecks.onboarding.fewer')
							: i18n.baseText('agents.builder.agentChecks.onboarding.moreCount', {
									interpolate: { count: String(hidden) },
								})
					}}
				</N8nButton>
			</div>
		</template>
	</section>
</template>

<style lang="scss" module>
// Lines up with the list's left edge above it.
.opener {
	--button--color: var(--text-color--subtle);
}

.ready {
	margin-inline-start: var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-weight: var(--font-weight--regular);
}

.head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.add {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.label {
	margin-top: var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
}

.list {
	overflow: hidden;
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);

	> * + * {
		border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
	}
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs) var(--spacing--xs);
	font-size: var(--font-size--sm);
}

// Kind on top, the message under it on up to two lines.
.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.kind {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

.prompt {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	line-height: var(--line-height--xl);
}
</style>
