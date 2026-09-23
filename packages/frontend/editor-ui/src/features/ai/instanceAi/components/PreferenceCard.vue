<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import type { InstanceAiToolCallState } from '@n8n/api-types';
import {
	N8nAiActivityStepChevron,
	N8nAnimatedCollapsibleContent,
	N8nCallout,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';

import { VIEWS } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { resolvePreferenceCard, resolvePreferenceRejection } from '../preferenceCard.utils';
import { preferenceScopeLabel } from '../preferenceScope.utils';
import PreferenceEditModal from './PreferenceEditModal.vue';

const props = defineProps<{
	toolCall: InstanceAiToolCallState;
	runId: string;
	/** True unless the card belongs to the latest turn. */
	readOnly: boolean;
}>();

const i18n = useI18n();

const card = computed(() => resolvePreferenceCard(props.toolCall));
// A refused write renders too, so the person does not depend on the assistant's account.
const rejection = computed(() => resolvePreferenceRejection(props.toolCall));
// The call ended before it answered, so the row may or may not exist.
const isUnconfirmed = computed(() => rejection.value?.reason === 'interrupted');

const projectsStore = useProjectsStore();
const scopeLabel = computed(() =>
	card.value
		? preferenceScopeLabel(i18n, card.value.scope, card.value.projectId, projectsStore.myProjects)
		: '',
);
const isRemoved = computed(() => card.value?.state === 'undone');
// Only the latest turn may correct a preference, and a removed one has nothing to correct.
const isEditable = computed(() => card.value !== null && !props.readOnly && !isRemoved.value);

const rowLabel = computed(() => {
	if (isUnconfirmed.value) return i18n.baseText('instanceAi.preferenceCard.notConfirmed');
	if (rejection.value) return i18n.baseText('instanceAi.preferenceCard.notSaved');
	return isRemoved.value
		? i18n.baseText('instanceAi.preferenceCard.removed')
		: i18n.baseText('instanceAi.preferenceCard.saved');
});

/** The saved text, or the text the assistant tried to save. */
const text = computed(() => rejection.value?.content ?? card.value?.content);

/** Prefer the server's explanation over the generic line. */
const rejectionMessage = computed(() => {
	if (isUnconfirmed.value) return i18n.baseText('instanceAi.preferenceCard.notConfirmedMessage');
	return rejection.value?.message ?? i18n.baseText('instanceAi.preferenceCard.notSavedFallback');
});

// The active turn shows the card; an earlier turn collapses to the row. The chevron
// overrides either default.
const userToggled = ref<boolean | null>(null);
const expanded = computed(() => userToggled.value ?? !props.readOnly);
// A later turn moves the card into history, and history collapses whatever the
// chevron did on the active turn.
watch(
	() => props.readOnly,
	(readOnly) => {
		if (readOnly) userToggled.value = null;
	},
);

const modalOpen = ref(false);
</script>

<template>
	<CollapsibleRoot
		v-if="card || rejection"
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
				<N8nIcon :icon="rejection ? 'triangle-alert' : 'bookmark'" size="small" />
				<span :class="$style.title">{{ rowLabel }}</span>
				<N8nAiActivityStepChevron :open="expanded" />
			</button>
		</CollapsibleTrigger>

		<N8nAnimatedCollapsibleContent>
			<div :class="$style.card">
				<N8nText
					v-if="text"
					tag="p"
					size="small"
					:class="{ [$style.removedText]: isRemoved, [$style.attemptedText]: rejection }"
					data-test-id="instance-ai-preference-card-text"
				>
					{{ text }}
				</N8nText>

				<N8nCallout
					v-if="rejection"
					:theme="isUnconfirmed ? 'warning' : 'danger'"
					data-test-id="instance-ai-preference-card-error"
				>
					{{ rejectionMessage }}
				</N8nCallout>

				<div v-else :class="$style.scope">
					<N8nIcon icon="layers" size="small" />
					<N8nText size="small" color="text-light" data-test-id="instance-ai-preference-card-scope">
						{{
							i18n.baseText('instanceAi.preferenceCard.appliesTo', {
								interpolate: { scope: scopeLabel },
							})
						}}
					</N8nText>
				</div>

				<template v-if="rejection || !isRemoved">
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
			v-if="card && isEditable"
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

/* A refused text can be far over the cap, so clamp it. */
.attemptedText {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	overflow: hidden;
	color: var(--text-color--subtle);
}
</style>
