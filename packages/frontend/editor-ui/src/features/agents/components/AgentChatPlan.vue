<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core';
import type { RouteLocationRaw } from 'vue-router';
import { type IconColor, N8nIcon, N8nScrollArea, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { AgentPlanItemStatus, AgentPlanView } from '../utils/agent-plan';
import { formatAgentElapsedTime } from '../utils/agent-elapsed-time';
import ChatCollapsibleContainer from '@/features/ai/shared/components/ChatCollapsibleContainer.vue';
import { TIME } from '@/app/constants/durations';

const props = defineProps<{ plan: AgentPlanView; traceRoute?: RouteLocationRaw }>();
const i18n = useI18n();
const expanded = ref(false);
watch(
	() => props.plan.planId,
	() => {
		expanded.value = false;
	},
);
const now = ref(Date.now());
const documentVisibility = useDocumentVisibility();
const startTime = computed(() => Date.parse(props.plan.startedAt ?? ''));
const { pause, resume } = useIntervalFn(
	() => {
		now.value = Date.now();
	},
	TIME.SECOND,
	{ immediate: false },
);
watch(
	() =>
		Number.isFinite(startTime.value) &&
		!props.plan.closed &&
		documentVisibility.value === 'visible',
	(active) => {
		if (active) {
			now.value = Date.now();
			resume();
		} else pause();
	},
	{ immediate: true },
);
const elapsed = computed(() => {
	const endTime = props.plan.closed ? Date.parse(props.plan.closedAt ?? '') : now.value;
	if (!Number.isFinite(startTime.value) || !Number.isFinite(endTime)) return null;
	return formatAgentElapsedTime(endTime - startTime.value);
});
const label = computed(() =>
	props.plan.closed
		? (props.plan.document.presentation?.detail ?? props.plan.document.title)
		: (props.plan.document.presentation?.label ??
			i18n.baseText('agents.chat.plan.title', {
				interpolate: { title: props.plan.document.title },
			})),
);
const isRunning = computed(
	() =>
		!props.plan.closed &&
		props.plan.document.items.some(
			(item) =>
				item.status === 'in_progress' ||
				(item.kind === 'group' && item.tasks.some((task) => task.status === 'in_progress')),
		),
);
const statusLabels: Record<AgentPlanItemStatus, BaseTextKey> = {
	pending: 'agents.chat.plan.status.pending',
	in_progress: 'agents.chat.plan.status.inProgress',
	done: 'agents.chat.plan.status.done',
	failed: 'agents.chat.plan.status.failed',
	cancelled: 'agents.chat.plan.status.canceled',
};
const statusIcons = {
	pending: 'circle',
	in_progress: 'loader',
	done: 'check',
	failed: 'x',
	cancelled: 'x',
} as const;
const statusIconColors: Record<AgentPlanItemStatus, IconColor> = {
	pending: 'text-light',
	in_progress: 'text-light',
	done: 'success',
	failed: 'danger',
	cancelled: 'text-xlight',
} as const;
</script>

<template>
	<div :class="$style.plan" data-testid="agent-chat-plan">
		<ChatCollapsibleContainer
			:key="plan.planId"
			v-model:expanded="expanded"
			:label="label"
			:title="plan.closed || plan.document.presentation ? label : plan.document.title"
		>
			<template #header>
				<N8nIcon
					:icon="isRunning ? 'loader-circle' : 'list-checks'"
					:spin="isRunning"
					:class="{ [$style.running]: isRunning }"
					size="medium"
					color="text-light"
					aria-hidden="true"
					data-testid="agent-chat-plan-indicator"
				/>
				<N8nText bold step="xs" :class="[$style.label, { [$style.inProgress]: isRunning }]">{{
					label
				}}</N8nText>
			</template>
			<template v-if="elapsed !== null" #header-trailing>
				<N8nText
					step="xs"
					bold
					color="text-xlight"
					aria-live="off"
					:class="$style.timer"
					data-testid="agent-chat-plan-timer"
					>{{ elapsed }}</N8nText
				>
			</template>
			<N8nScrollArea
				as-child
				type="hover"
				max-height="20vh"
				:class="$style.details"
				role="region"
				:aria-label="plan.document.title"
				tabindex="0"
				data-testid="agent-chat-plan-details"
			>
				<div>
					<N8nText
						v-if="!plan.closed && plan.document.presentation?.detail"
						:class="$style.detail"
						:title="plan.document.presentation.detail"
					>
						{{ plan.document.presentation.detail }}
					</N8nText>
					<ul
						:class="$style.items"
						:aria-label="plan.document.title"
						data-testid="agent-chat-plan-items"
					>
						<li
							v-for="item in plan.document.items"
							:key="item.id"
							:class="[
								$style.parentItem,
								{ [$style.hasChildren]: item.kind === 'group' && item.tasks.length > 0 },
							]"
						>
							<div :class="[$style.row, { [$style.group]: item.kind === 'group' }]">
								<span
									:class="$style.parentIcon"
									role="img"
									:aria-label="i18n.baseText(statusLabels[item.status])"
									:title="i18n.baseText(statusLabels[item.status])"
									:data-status="item.status"
								>
									<N8nIcon
										:icon="statusIcons[item.status]"
										:spin="item.status === 'in_progress'"
										:color="statusIconColors[item.status]"
										size="medium"
										aria-hidden="true"
									/>
								</span>

								<N8nText
									bold
									step="xs"
									:color="item.status === 'done' ? undefined : 'text-light'"
									:class="[$style.itemTitle, { [$style.inProgress]: item.status === 'in_progress' }]"
									:title="item.title"
									>{{ item.title }}</N8nText
								>
							</div>
							<ul v-if="item.kind === 'group'" :class="$style.children">
								<li v-for="task in item.tasks" :key="task.id" :class="$style.row">
									<svg
										:class="$style.treeBranch"
										viewBox="0 0 16 8"
										preserveAspectRatio="none"
										fill="none"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path d="M0 0Q0 4 4 4H16" />
									</svg>
									<span
										role="img"
										:aria-label="i18n.baseText(statusLabels[task.status])"
										:title="i18n.baseText(statusLabels[task.status])"
										:data-status="task.status"
									>
										<N8nIcon
											:icon="statusIcons[task.status]"
											:color="statusIconColors[task.status]"
											:spin="task.status === 'in_progress'"
											size="medium"
											aria-hidden="true"
										/>
									</span>
									<N8nText
										bold
										step="xs"
										:color="task.status === 'done' ? undefined : 'text-light'"
										:class="[
											$style.itemTitle,
											{ [$style.inProgress]: task.status === 'in_progress' },
										]"
										:title="task.title"
										>{{ task.title }}</N8nText
									>
								</li>
							</ul>
						</li>
					</ul>
				</div>
			</N8nScrollArea>
		</ChatCollapsibleContainer>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';
@use '@n8n/design-system/css/mixins/utils';
@use '@n8n/design-system/css/mixins/mixins';

.label {
	@include utils.utils-ellipsis;
}

.footer {
	padding: var(--spacing--xs) var(--spacing--sm);
}

.timer {
	font-variant-numeric: tabular-nums;
	flex-shrink: 0;
}

.details {
	min-height: 0;
	height: auto;

	@include mixins.scroll-mask(bottom);
	> * {
		padding-block: var(--spacing--4xs) var(--spacing--sm);
	}
}

.items {
	--plan-rail-offset: calc(var(--spacing--xs) + var(--spacing--3xs));

	list-style: none;
	margin: 0;
	padding: 0;
}

.detail {
	padding-block: var(--spacing--xs) var(--spacing--2xs);
	padding-inline: var(--spacing--xs);
	color: var(--text-color--subtle);
	white-space: pre-wrap;
	text-wrap: balance;
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	overflow: hidden;
}

.itemTitle {
	min-width: 0;
	@include utils.utils-ellipsis;
}

.inProgress {
	--animation--shimmer--duration: var(--duration--slowest);
	--animation--shimmer--foreground: var(--text-color--subtle);
	--animation--shimmer--background: var(--text-color--subtler);
	@include motion.shimmer;
}

.running {
	color: var(--color--primary);
}

.parentItem {
	position: relative;

	&::after {
		content: '';
		position: absolute;
		inset-inline-start: var(--plan-rail-offset);
		inset-block-start: calc(var(--height--lg) / 2);
		inset-block-end: calc(var(--height--lg) / -2);
		border-inline-start: 1.5px solid
			color-mix(in oklch, var(--background--subtle), light-dark(black, white) 8%);
		pointer-events: none;
	}

	&:last-child::after {
		inset-block-end: calc(var(--height--lg) / 2);
	}

	&:last-child.hasChildren::after {
		inset-block-end: calc(var(--height--lg) / 2 + var(--spacing--4xs));
	}
}

.parentIcon {
	position: relative;
	z-index: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: var(--background--subtle);
	box-shadow: 0 0 0 var(--spacing--3xs) var(--background--subtle);
}

.children {
	list-style: none;
	margin: 0;
	padding: 0 0 0 var(--spacing--lg);

	> .row {
		position: relative;
	}
}

.treeBranch {
	position: absolute;
	inset-inline-start: calc(var(--plan-rail-offset) - calc(var(--spacing--lg) - 1px));
	inset-block-start: calc(50% - var(--spacing--4xs));
	width: calc(var(--spacing--sm) - var(--spacing--4xs));
	height: var(--spacing--2xs);
	overflow: visible;
	color: color-mix(in oklch, var(--background--subtle), light-dark(black, white) 8%);
	pointer-events: none;

	path {
		stroke-width: 1.5px;
		vector-effect: non-scaling-stroke;
	}
}

.row {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	padding-inline: var(--spacing--xs);
	gap: var(--spacing--2xs);
	height: var(--height--md);
	overflow-wrap: anywhere;
	line-height: var(--line-height--lg);
	user-select: none;
}

.group {
	font-weight: var(--font-weight--bold);
}

.status {
	display: inline-flex;
	align-items: center;
	height: calc(var(--font-size--2xs) * var(--line-height--lg));
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
