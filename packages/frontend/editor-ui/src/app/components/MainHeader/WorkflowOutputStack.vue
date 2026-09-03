<script setup lang="ts">
import { N8nDropdownMenu, N8nIcon, N8nPopover, N8nTooltip } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';

import WorkflowOutputStackCards from '@/app/components/MainHeader/WorkflowOutputStackCards.vue';
import WireframeReviewerPlus from '@/app/components/wireframe/WireframeReviewerPlus.vue';
import { useWorkflowOutputStack } from '@/app/composables/useWorkflowOutputStack';
import { useWireframeReviewers } from '@/features/agents/composables/useWireframeReviewers';

// Wireframe: the workflow's outputs as one badge in the header. Same words as
// the agent badge; the popover walks the stack from the top.
const i18n = useI18n();
const usersStore = useUsersStore();
const stack = useWorkflowOutputStack();
const reviewers = useWireframeReviewers(stack.workflowId);

const open = ref(false);
// Before any run, Preview runs the workflow (pinning a sample event if needed) and
// the popover opens itself when the run lands.
watch(open, (isOpen) => {
	if (isOpen && !stack.execution.value) {
		open.value = false;
		runAgain();
	}
});

// A finished run opens the outputs by itself — that's the moment to look.
watch(
	() => stack.execution.value?.status,
	(status, previous) => {
		if (previous === 'running' && (status === 'success' || status === 'error')) open.value = true;
	},
);

const cadence = ref<'auto' | 'every' | 'manual'>('auto');
const cadenceItems = computed<Array<DropdownMenuItemProps<'auto' | 'every' | 'manual'>>>(() =>
	(['auto', 'every', 'manual'] as const).map((id) => ({
		id,
		label: i18n.baseText(`workflows.stack.cadence.${id}`),
		checked: cadence.value === id,
	})),
);

const initials = computed(() =>
	[usersStore.currentUser?.firstName, usersStore.currentUser?.lastName]
		.map((p) => p?.trim().charAt(0) ?? '')
		.join('')
		.toUpperCase(),
);

// Wireframe stub: reruns by pressing the canvas run button.
function runAgain() {
	const button = document.querySelector<HTMLButtonElement>(
		'[data-test-id="execute-workflow-button"]',
	);
	button?.click();
}

// Any Execute press on an event-triggered workflow gets a sample event pinned first,
// so the run goes through instead of waiting for a webhook. The first click is
// swallowed, the pin is applied, and the click is re-issued once the store settled.
// The backend runs the workflow as saved, so the pin has to be saved first.
const router = useRouter();
const { saveCurrentWorkflow } = useWorkflowSaving({ router });
let reissuing = false;
function onDocumentClickCapture(event: MouseEvent) {
	const target = event.target as HTMLElement | null;
	const button = target?.closest<HTMLButtonElement>('[data-test-id="execute-workflow-button"]');
	if (!button || reissuing || !stack.needsSimulation.value) return;
	event.stopPropagation();
	event.preventDefault();
	stack.pinSampleEvents();
	reissuing = true;
	void (async () => {
		try {
			await nextTick();
			await saveCurrentWorkflow({}, false);
			button.click();
		} finally {
			reissuing = false;
		}
	})();
}
onMounted(() => document.addEventListener('click', onDocumentClickCapture, true));
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClickCapture, true));
</script>

<template>
	<N8nPopover
		v-model:open="open"
		width="min(36rem, calc(100vw - 2rem))"
		align="end"
		:collision-padding="16"
		:show-arrow="false"
	>
		<template #trigger>
			<button
				type="button"
				:class="[$style.preview, { [$style.previewActive]: open }]"
				:aria-label="i18n.baseText('workflows.stack.badge.ariaLabel')"
				data-testid="workflow-stack-badge"
				:data-state="stack.badgeState.value"
			>
				<N8nIcon v-if="stack.isRunning.value" icon="loader-circle" :size="12" spin />
				<N8nIcon v-else icon="play" :size="12" />
				<span>{{ i18n.baseText('workflows.stack.preview') }}</span>
				<span
					v-if="stack.execution.value && stack.visible.value.length > 0"
					:class="[$style.count, $style[`count_${stack.badgeState.value}`]]"
					data-testid="workflow-stack-count"
				>
					{{ stack.visible.value.length }}
				</span>
			</button>
		</template>
		<template #content>
			<div :class="$style.popover" data-testid="workflow-stack-popover">
				<div :class="$style.topRow">
					<N8nDropdownMenu
						:items="cadenceItems"
						placement="bottom-start"
						width="14rem"
						@select="cadence = $event"
					>
						<template #trigger>
							<button type="button" :class="$style.cadence">
								{{ i18n.baseText(`workflows.stack.cadence.${cadence}`) }}
								<N8nIcon icon="chevron-down" :size="12" />
							</button>
						</template>
					</N8nDropdownMenu>
					<span :class="$style.grow" />
					<div :class="$style.cluster" data-testid="workflow-stack-cluster">
						<span :class="[$style.avatar, $style.person]">{{ initials }}</span>
						<N8nTooltip
							v-for="r in reviewers.people.value"
							:key="r.id"
							:content="r.email ? `${r.name} · ${r.email}` : r.name"
							placement="bottom"
						>
							<span :class="[$style.avatar, $style.person, $style.invited]">{{
								reviewers.initialsOf(r.name)
							}}</span>
						</N8nTooltip>
						<N8nTooltip
							:content="i18n.baseText('agents.builder.checks.evalAgent.tooltip')"
							placement="bottom"
						>
							<span :class="[$style.avatar, $style.tester]"
								><N8nIcon icon="flask-conical" :size="13"
							/></span>
						</N8nTooltip>
						<N8nTooltip
							v-for="t in reviewers.testers.value"
							:key="t.id"
							:content="
								i18n.baseText('wireframe.reviewers.tester.tooltip', {
									interpolate: { name: t.name },
								})
							"
							placement="bottom"
						>
							<span :class="[$style.avatar, $style.customTester]"
								><N8nIcon icon="bot" :size="13"
							/></span>
						</N8nTooltip>
						<WireframeReviewerPlus :project-id="stack.projectId.value" :reviewers="reviewers" />
					</div>
				</div>

				<WorkflowOutputStackCards :stack="stack" @navigate="open = false" />
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: 1.75rem;
	margin-right: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs) 0 var(--spacing--3xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--wireframe--ink);
	font-family: var(--wireframe--font-family);
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--2xs);
	letter-spacing: var(--wireframe--letter-spacing);
	white-space: nowrap;
	cursor: pointer;

	&:hover,
	&.active {
		background: var(--wireframe--hover-fill);
	}
}

.preview {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: 1.75rem;
	margin-right: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--wireframe--ink);
	font-family: var(--wireframe--font-family);
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--2xs);
	letter-spacing: var(--wireframe--letter-spacing);
	white-space: nowrap;
	cursor: pointer;

	&:hover,
	&.previewActive {
		background: var(--wireframe--hover-fill);
	}
}

.count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 1.1rem;
	height: 1.1rem;
	padding: 0 0.25rem;
	border-radius: 0.55rem;
	background: var(--border-color--strong);
	color: var(--background--surface);
	font-size: 0.6rem;
	line-height: 1;
}
.count_ok {
	background: var(--color--success);
}
.count_flagged {
	background: var(--color--danger);
}

.badgeDot,
.dot {
	width: 0.6rem;
	height: 0.6rem;
	border-radius: 50%;
	border: var(--wireframe--border-width) solid var(--border-color--strong);
	flex-shrink: 0;
}

.badge_running .badgeDot {
	border-color: var(--color--warning);
}
.badge_needsEye .badgeDot {
	background: var(--border-color--strong);
}
.badge_ok {
	border-color: var(--color--success);
	color: var(--color--success);
	.badgeDot {
		background: var(--color--success);
		border-color: var(--color--success);
	}
}
.badge_flagged {
	border-color: var(--color--danger);
	color: var(--color--danger);
	.badgeDot {
		background: var(--color--danger);
		border-color: var(--color--danger);
	}
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.35;
	}
}
.pulse {
	animation: pulse 1.2s ease-in-out infinite;
}

.popover {
	display: flex;
	flex-direction: column;
	font-family: var(--wireframe--font-family);
	letter-spacing: var(--wireframe--letter-spacing);
	font-size: var(--font-size--sm);
	color: var(--text-color);
}

.topRow,
.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
}

.topRow {
	border-bottom: var(--border);
}

.footer {
	border-top: var(--border);
}

.title {
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--md);
}

.grow {
	flex: 1;
}

.muted {
	color: var(--text-color--subtler);
}

.caughtUp {
	color: var(--color--success);
	font-weight: var(--wireframe--font-weight);
}

.reviewButton {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--wireframe--ink);
	color: var(--background--surface);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	letter-spacing: inherit;
	cursor: pointer;
}

.cluster {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 50%;
	border: var(--wireframe--border);
	background: var(--background--surface);
	font-size: var(--font-size--2xs);
	font-weight: var(--wireframe--font-weight);
	line-height: 1;
}

.person {
	background: color-mix(in srgb, var(--color--success) 20%, var(--background--surface));
}

.tester {
	background: color-mix(in srgb, var(--color--warning) 18%, var(--background--surface));
	color: var(--color--warning);
}

.invited {
	background: color-mix(in srgb, var(--color--primary) 18%, var(--background--surface));
}

.customTester {
	border-style: dashed;
	border-color: var(--color--primary);
	color: var(--color--primary);
}

.button,
.textButton,
.cadence {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--wireframe--ink);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	letter-spacing: inherit;
	white-space: nowrap;
	cursor: pointer;

	&:hover {
		background: var(--wireframe--hover-fill);
	}

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
}

.cadence {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--wireframe--ink);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	letter-spacing: inherit;
	white-space: nowrap;
	cursor: pointer;

	&:hover {
		background: var(--wireframe--hover-fill);
	}

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
}

.textButton {
	border-color: transparent;
	color: var(--text-color--subtler);
}

.primary {
	background: var(--wireframe--ink);
	color: var(--background--surface);

	&:hover {
		background: var(--wireframe--ink);
	}
}
</style>
