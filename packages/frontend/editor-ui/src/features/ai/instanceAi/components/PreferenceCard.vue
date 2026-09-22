<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import type { InstanceAiToolCallState } from '@n8n/api-types';
import {
	N8nAiActivityStepChevron,
	N8nAnimatedCollapsibleContent,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';

import { VIEWS } from '@/app/constants';

import { resolvePreferenceCard } from '../preferenceCard.utils';
import PreferenceEditModal from './PreferenceEditModal.vue';

const props = defineProps<{
	toolCall: InstanceAiToolCallState;
	runId: string;
	/** True unless the card belongs to the latest turn. */
	readOnly: boolean;
}>();

const i18n = useI18n();

const card = computed(() => resolvePreferenceCard(props.toolCall));
const isRemoved = computed(() => card.value?.state === 'undone');
// Only the latest turn may correct a preference, and a removed one has nothing to correct.
const isEditable = computed(() => !props.readOnly && !isRemoved.value);

const rowLabel = computed(() =>
	isRemoved.value
		? i18n.baseText('instanceAi.preferenceCard.removed')
		: i18n.baseText('instanceAi.preferenceCard.saved'),
);

// The active turn shows the card; an earlier turn collapses to the row. The chevron
// overrides either default.
const userToggled = ref<boolean | null>(null);
const expanded = computed(() => userToggled.value ?? !props.readOnly);

const modalOpen = ref(false);
</script>

<template>
	<CollapsibleRoot
		v-if="card"
		:open="expanded"
		data-test-id="instance-ai-preference-card"
		@update:open="(value) => (userToggled = value)"
	>
		<CollapsibleTrigger as-child>
			<button
				type="button"
				:class="$style.header"
				:aria-expanded="expanded"
				data-test-id="instance-ai-preference-card-header"
			>
				<N8nIcon icon="bookmark" size="small" />
				<span :class="$style.title">{{ rowLabel }}</span>
				<N8nAiActivityStepChevron :open="expanded" />
			</button>
		</CollapsibleTrigger>

		<N8nAnimatedCollapsibleContent>
			<div :class="$style.card">
				<N8nText
					tag="p"
					size="small"
					:class="isRemoved ? $style.removedText : undefined"
					data-test-id="instance-ai-preference-card-text"
				>
					{{ card.content }}
				</N8nText>

				<div :class="$style.scope">
					<N8nIcon icon="layers" size="small" />
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.preferenceCard.appliesTo') }}
						{{ i18n.baseText('instanceAi.preferenceCard.scope.user') }}
					</N8nText>
				</div>

				<template v-if="!isRemoved">
					<div :class="$style.separator" />
					<div :class="$style.links">
						<button
							v-if="isEditable"
							type="button"
							:class="$style.link"
							data-test-id="instance-ai-preference-card-edit"
							@click="modalOpen = true"
						>
							{{ i18n.baseText('instanceAi.preferenceCard.edit') }}
						</button>
						<RouterLink
							:to="{ name: VIEWS.SETTINGS_CONTEXT_PREFERENCES }"
							:class="$style.link"
							data-test-id="instance-ai-preference-card-manage"
						>
							{{ i18n.baseText('instanceAi.preferenceCard.manage') }}
						</RouterLink>
					</div>
				</template>
			</div>
		</N8nAnimatedCollapsibleContent>

		<PreferenceEditModal
			v-if="isEditable"
			v-model:open="modalOpen"
			:preference-id="card.preferenceId"
			:content="card.content"
			:run-id="props.runId"
			:tool-call-id="props.toolCall.toolCallId"
		/>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
/* Same row as "Finished thinking" (AiThinkingBlock.vue): one muted line, an
   inline chevron, and no surface of its own. */
.header {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	max-width: 90%;
	border: 0;
	background: transparent;
	padding: var(--spacing--4xs) 0;
	cursor: pointer;
	text-align: left;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--lg);

	&:hover {
		color: var(--text-color--subtle);
	}
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
}

.scope {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtler);
}

.separator {
	border-top: var(--border-width) dashed var(--color--foreground);
}

.links {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.link {
	border: 0;
	background: transparent;
	padding: 0;
	cursor: pointer;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);

	&:hover {
		color: var(--text-color--subtle);
	}
}

.removedText {
	text-decoration: line-through;
	color: var(--color--text--tint-1);
}
</style>
