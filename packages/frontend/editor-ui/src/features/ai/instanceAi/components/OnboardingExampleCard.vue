<script setup lang="ts">
import { computed, ref } from 'vue';
import type { OnboardingExampleNode } from '@n8n/api-types';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { isOnboardingExampleQuestion } from '../confirmationKinds';
import { useThread } from '../instanceAi.store';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

/**
 * The onboarding example, one node at a time. The step lives here only: a reload starts over. On
 * the last node, the card shows the options of the question the host posted under it.
 */
const props = defineProps<{ nodes: OnboardingExampleNode[] }>();

const i18n = useI18n();
const thread = useThread();
const nodeTypesStore = useNodeTypesStore();

const step = ref(0);
const current = computed(() => props.nodes[step.value]);
const isFirst = computed(() => step.value === 0);
const isLast = computed(() => step.value === props.nodes.length - 1);

const pendingQuestion = computed(() =>
	thread.pendingConfirmations.find(isOnboardingExampleQuestion),
);
const question = computed(() => pendingQuestion.value?.toolCall.confirmation.questions?.[0]);

function choose(option: string) {
	const requestId = pendingQuestion.value?.toolCall.confirmation.requestId;
	const questionId = question.value?.id;
	if (!requestId || !questionId) return;
	// Read both first: resolving drops the question from the pending list.
	thread.resolveConfirmation(requestId, 'approved');
	void thread.confirmAction(requestId, {
		kind: 'questions',
		answers: [{ questionId, selectedOptions: [option] }],
	});
}
</script>

<template>
	<div :class="$style.card" data-test-id="onboarding-example-card">
		<ol :class="$style.strip">
			<li
				v-for="(node, index) in props.nodes"
				:key="node.name"
				:class="[$style.node, index === step && $style.current, index < step && $style.done]"
			>
				<button
					type="button"
					:class="$style.nodeButton"
					:aria-label="node.name"
					:aria-current="index === step ? 'step' : undefined"
					@click="step = index"
				>
					<NodeIcon
						:node-type="nodeTypesStore.getNodeType(node.type, node.typeVersion)"
						:size="36"
					/>
				</button>
				<!-- The state shows in the border and the name, never in opacity: every node is clickable. -->
				<N8nText
					size="small"
					:bold="index === step"
					:color="index > step ? 'text-light' : 'text-dark'"
					:class="$style.name"
				>
					{{ node.name }}
				</N8nText>
			</li>
		</ol>
		<div v-if="current" :class="$style.explanation">
			<N8nText tag="div" size="large" bold>{{ current.name }}</N8nText>
			<!-- Same text size as a chat message, so bold words do not grow. -->
			<InstanceAiMarkdown :content="current.explanation" />
		</div>
		<div :class="$style.footer">
			<N8nText size="small" color="text-light">
				{{
					i18n.baseText('instanceAi.onboardingExample.counter', {
						interpolate: { current: String(step + 1), total: String(props.nodes.length) },
					})
				}}
			</N8nText>
			<div :class="$style.actions">
				<!-- Skips the tour to the choice on the last node; gone once the user chose. -->
				<N8nButton
					v-if="!isLast && question"
					variant="ghost"
					size="medium"
					data-test-id="onboarding-example-skip"
					@click="step = props.nodes.length - 1"
				>
					{{ i18n.baseText('instanceAi.onboardingExample.skip') }}
				</N8nButton>
				<N8nButton v-if="!isFirst" variant="ghost" size="medium" @click="step--">
					{{ i18n.baseText('instanceAi.onboardingExample.back') }}
				</N8nButton>
				<N8nButton v-if="!isLast" size="medium" @click="step++">
					{{ i18n.baseText('instanceAi.onboardingExample.next') }}
				</N8nButton>
				<template v-else-if="question">
					<N8nButton
						v-for="(option, index) in question.options"
						:key="option"
						:variant="index === 0 ? 'solid' : 'outline'"
						size="medium"
						@click="choose(option)"
					>
						{{ option }}
					</N8nButton>
				</template>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--xl);
	background-color: var(--background--surface);
}

/* Wraps on a narrow chat column instead of scrolling the page. */
.strip {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--sm);
	margin: 0;
	padding: 0;
	list-style: none;
}

.node {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--3xs);
	/* No width token exists; the 96px height step keeps each name under its icon. */
	width: var(--height--5xl);
}

/* Upcoming nodes keep the default border. */
.nodeButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--height--4xl);
	height: var(--height--4xl);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	cursor: pointer;
	transition:
		border-color var(--duration--snappy) ease,
		box-shadow var(--duration--snappy) ease;
}

.done .nodeButton {
	border-color: var(--border-color--success);
}

.current .nodeButton {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 var(--spacing--5xs) var(--color--primary--tint-2);
}

.name {
	text-align: center;
}

.explanation {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-height: var(--height--5xl);
}

.footer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}
</style>
