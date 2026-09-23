<script setup lang="ts">
import {
	N8nAssistantAvatar,
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { VIEWS } from '@/app/constants';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';

import { useSelfHealingStore } from '../selfHealing.store';

/**
 * Detail pane for the two inbox kinds that are not reviews. There is no diff
 * and nothing to approve: the item explains what failed, what the assistant
 * found, and what the user should do. Dismiss closes it.
 */
const props = defineProps<{
	reviewId: string;
}>();

const emit = defineEmits<{
	dismiss: [];
}>();

const i18n = useI18n();
const router = useRouter();
const store = useSelfHealingStore();

const review = computed(() => store.findReview(props.reviewId));
const outcome = computed(() => review.value?.outcome ?? null);
const isOpen = computed(() => review.value?.item.state === 'open');
const workflowName = computed(() => review.value?.item.workflowName ?? '');

const headline = computed(() =>
	i18n.baseText(
		outcome.value?.kind === 'needs_you'
			? 'selfHealing.outcome.needsYou.headline'
			: 'selfHealing.outcome.couldNotFix.headline',
	),
);

const body = computed(() =>
	i18n.baseText(
		outcome.value?.kind === 'needs_you'
			? 'selfHealing.outcome.needsYou.body'
			: 'selfHealing.outcome.couldNotFix.body',
	),
);

const usageText = computed(() => {
	const usage = outcome.value?.usage;
	if (!usage) return i18n.baseText('selfHealing.outcome.usage.none');
	return i18n.baseText('selfHealing.outcome.usage.value', {
		interpolate: {
			credits: String(usage.credits),
			turns: String(usage.turns),
			minutes: String(Math.max(1, Math.round(usage.durationSeconds / 60))),
		},
	});
});

async function onOpenCredential() {
	await router.push({ name: VIEWS.CREDENTIALS });
}

async function onContinueInChat() {
	await router.push({ name: INSTANCE_AI_VIEW });
}
</script>

<template>
	<div
		v-if="review && outcome"
		:class="$style.container"
		data-test-id="self-healing-outcome-detail"
	>
		<div :class="$style.topRow">
			<N8nCallout
				:theme="outcome.kind === 'needs_you' ? 'warning' : 'secondary'"
				:class="$style.callout"
			>
				<div :class="$style.calloutContent">
					<N8nText bold size="medium">{{ headline }}</N8nText>
					<N8nText size="medium">{{ body }}</N8nText>
				</div>
			</N8nCallout>

			<div v-if="isOpen" :class="$style.actions">
				<N8nButton
					variant="outline"
					size="small"
					:label="i18n.baseText('selfHealing.outcome.action.dismiss')"
					data-test-id="self-healing-outcome-dismiss"
					@click="emit('dismiss')"
				/>
				<N8nButton
					v-if="outcome.action?.type === 'open_credential'"
					size="small"
					icon="key-round"
					:label="i18n.baseText('selfHealing.outcome.action.openCredential')"
					data-test-id="self-healing-outcome-open-credential"
					@click="onOpenCredential"
				/>
				<N8nButton
					v-else-if="outcome.kind === 'could_not_fix'"
					size="small"
					icon="message-circle"
					:label="i18n.baseText('selfHealing.outcome.action.continueInChat')"
					data-test-id="self-healing-outcome-continue-in-chat"
					@click="onContinueInChat"
				/>
			</div>
			<N8nText
				v-else
				size="small"
				color="text-light"
				:class="$style.dismissed"
				data-test-id="self-healing-outcome-dismissed"
			>
				{{ i18n.baseText('selfHealing.outcome.dismissed') }}
				<TimeAgo v-if="outcome.dismissedAt" :date="outcome.dismissedAt" />
			</N8nText>
		</div>

		<div :class="$style.meta">
			<span :class="$style.author">
				<N8nAssistantAvatar size="mini" />
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('selfHealing.outcome.author') }}
				</N8nText>
			</span>
			<N8nBadge v-if="workflowName" theme="tertiary" :show-border="false">
				<span :class="$style.badgeContent">
					<N8nIcon icon="workflow" size="small" />
					<span>{{ workflowName }}</span>
				</span>
			</N8nBadge>
			<N8nText v-if="review.executionId" size="small" color="text-light">
				{{
					i18n.baseText('selfHealing.outcome.execution', {
						interpolate: { id: review.executionId },
					})
				}}
			</N8nText>
			<N8nText size="small" color="text-light">
				<TimeAgo :date="review.item.createdAt" />
			</N8nText>
		</div>

		<N8nCard :class="$style.section">
			<N8nText tag="h3" bold color="text-light" size="medium">
				{{ i18n.baseText('selfHealing.outcome.section.failure') }}
			</N8nText>
			<N8nText size="medium" color="text-dark">
				{{
					i18n.baseText('selfHealing.outcome.failure.node', {
						interpolate: { node: outcome.failure.node },
					})
				}}
			</N8nText>
			<code :class="$style.error">{{ outcome.failure.message }}</code>
		</N8nCard>

		<N8nCard :class="$style.section">
			<N8nText tag="h3" bold color="text-light" size="medium">
				{{ i18n.baseText('selfHealing.outcome.section.findings') }}
			</N8nText>
			<N8nText size="medium" color="text-base">{{ outcome.findings }}</N8nText>
		</N8nCard>

		<N8nCard v-if="outcome.reason" :class="$style.section">
			<N8nText tag="h3" bold color="text-light" size="medium">
				{{ i18n.baseText('selfHealing.outcome.section.reason') }}
			</N8nText>
			<N8nText size="medium" color="text-base">{{ outcome.reason }}</N8nText>
		</N8nCard>

		<N8nCard :class="$style.section">
			<N8nText tag="h3" bold color="text-light" size="medium">
				{{ i18n.baseText('selfHealing.outcome.section.nextSteps') }}
			</N8nText>
			<ol :class="$style.steps">
				<li v-for="(step, index) in outcome.nextSteps" :key="index">
					<N8nText size="medium" color="text-base">{{ step }}</N8nText>
				</li>
			</ol>
		</N8nCard>

		<N8nCard :class="$style.section">
			<N8nText tag="h3" bold color="text-light" size="medium">
				{{ i18n.baseText('selfHealing.outcome.section.usage') }}
			</N8nText>
			<N8nText size="medium" color="text-base" data-test-id="self-healing-outcome-usage">
				{{ usageText }}
			</N8nText>
		</N8nCard>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-width: var(--review-activity--max-width);
	padding-right: var(--spacing--md);
}

.topRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.callout {
	max-width: none;
}

.calloutContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.dismissed {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
}

.meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.author {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.badgeContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.error {
	display: block;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	color: var(--color--text--shade-1);
	white-space: pre-wrap;
	word-break: break-word;
}

.steps {
	margin: 0;
	padding-left: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
