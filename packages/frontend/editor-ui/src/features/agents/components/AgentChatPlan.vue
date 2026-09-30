<script setup lang="ts">
import { computed } from 'vue';
import { N8nAiActivityStepGroup, N8nIcon } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { AgentPlanItemStatus, AgentPlanView } from '../utils/agent-plan';

const props = defineProps<{ plan: AgentPlanView }>();
const i18n = useI18n();
const statusLabels: Record<AgentPlanItemStatus, BaseTextKey> = {
	pending: 'agents.chat.plan.status.pending',
	in_progress: 'agents.chat.plan.status.inProgress',
	done: 'agents.chat.plan.status.done',
	failed: 'agents.chat.plan.status.failed',
	cancelled: 'agents.chat.plan.status.canceled',
};
const statusIcons = {
	pending: 'circle',
	in_progress: 'loader-circle',
	done: 'check',
	failed: 'x',
	cancelled: 'x',
} as const;
const summary = computed(() => {
	const tasks = props.plan.document.items.flatMap((item) =>
		item.kind === 'group' ? item.tasks : [item],
	);
	return i18n.baseText('agents.chat.plan.progress', {
		adjustToNumber: tasks.length,
		interpolate: {
			done: tasks.filter((task) => task.status === 'done').length,
			total: tasks.length,
		},
	});
});
</script>

<template>
	<div :class="$style.plan" data-testid="agent-chat-plan">
		<N8nAiActivityStepGroup
			:key="plan.planId"
			:label="
				i18n.baseText('agents.chat.plan.title', { interpolate: { title: plan.document.title } })
			"
			:title="plan.document.title"
			full-width
			content-position="above"
		>
			<template #prefix><N8nIcon icon="list-checks" size="small" aria-hidden="true" /></template>
			<template #header-trailing>
				<span :class="$style.summary" data-testid="agent-chat-plan-summary">{{ summary }}</span>
				<span v-if="plan.closed" :class="$style.summary">{{
					i18n.baseText('agents.chat.plan.closed')
				}}</span>
			</template>
			<ul
				:class="$style.items"
				:aria-label="plan.document.title"
				tabindex="0"
				data-testid="agent-chat-plan-items"
			>
				<li v-for="item in plan.document.items" :key="item.id">
					<div :class="[$style.row, { [$style.group]: item.kind === 'group' }]">
						<span
							role="img"
							:aria-label="i18n.baseText(statusLabels[item.status])"
							:title="i18n.baseText(statusLabels[item.status])"
							:data-status="item.status"
							:class="$style.status"
						>
							<N8nIcon
								:icon="statusIcons[item.status]"
								:spin="item.status === 'in_progress'"
								size="small"
								aria-hidden="true"
							/>
						</span>
						<span>{{ item.title }}</span>
					</div>
					<ul v-if="item.kind === 'group'" :class="$style.children">
						<li v-for="task in item.tasks" :key="task.id" :class="$style.row">
							<span
								role="img"
								:aria-label="i18n.baseText(statusLabels[task.status])"
								:title="i18n.baseText(statusLabels[task.status])"
								:data-status="task.status"
								:class="$style.status"
							>
								<N8nIcon
									:icon="statusIcons[task.status]"
									:spin="task.status === 'in_progress'"
									size="small"
									aria-hidden="true"
								/>
							</span>
							<span>{{ task.title }}</span>
						</li>
					</ul>
				</li>
			</ul>
		</N8nAiActivityStepGroup>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.plan {
	margin: calc(-1 * var(--spacing--2xs)) calc(-1 * var(--spacing--2xs)) 0;
	border-bottom: var(--border);
	min-width: 0;
	--ai-activity-step--height: auto;
	--ai-activity-step--min-height: var(--height--xl);
	--ai-activity-step--padding: var(--spacing--xs) var(--spacing--sm);
	--ai-activity-step--color: var(--text-color);
}

.summary {
	flex: 0 0 auto;
	width: auto;
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;
	color: var(--text-color--subtle);
}

.items {
	list-style: none;
	margin: 0;
	padding: var(--spacing--sm);
	max-height: 20vh;
	overflow-y: auto;
	overscroll-behavior: contain;
	border-bottom: var(--border);
	border-bottom-style: dashed;
}

.children {
	list-style: none;
	margin: 0;
	padding: 0 0 0 var(--spacing--lg);
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding-block: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
	min-width: 0;
}

.group {
	font-weight: var(--font-weight--bold);
}

.status {
	display: inline-flex;
	align-items: center;
	height: calc(var(--font-size--sm) * var(--line-height--lg));
	flex-shrink: 0;
	color: var(--color--foreground--shade-2);
	--animation--spin--duration: var(--duration--slow);

	&[data-status='in_progress'] {
		color: var(--color--primary);
	}
	&[data-status='done'] {
		color: var(--color--success);
		@include motion.fade-in;
	}
	&[data-status='failed'] {
		color: var(--color--danger);
	}
}
</style>
