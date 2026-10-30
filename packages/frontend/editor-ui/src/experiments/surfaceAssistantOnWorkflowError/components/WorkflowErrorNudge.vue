<!-- Experiment cleanup (119_surface_assistant_on_workflow_error) -->
<!-- Injects the "Fix with n8n Assistant" button inside error toasts on workflow error + defines CTA logic (on click, animations) -->
<script setup lang="ts">
import { N8nAssistantIcon, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowId } from '@/app/composables/useWorkflowId';
import { useInstanceAiHandoffCapability } from '@/features/ai/instanceAi/composables/useInstanceAiHandoffCapability';
import { INSTANCE_AI_SETTINGS_VIEW } from '@/features/ai/instanceAi/constants';
import {
	WORKFLOW_ERROR_NUDGE_BORDER_PASS_MS,
	WORKFLOW_ERROR_NUDGE_TOAST_CLASS,
	dismissWorkflowErrorNudge,
	isWorkflowErrorNudgeVisible,
	workflowErrorNudgeVariant,
	workflowErrorNudgeWorkflowId,
} from '../composables/useSurfaceAssistantOnWorkflowError';
import { buildNudgeOutline, type NudgeOutline } from '../workflowErrorNudgeOutline';
import { restackContentToasts } from '../workflowErrorNudgePosition';
import {
	trackErrorToastFixWithAssistantClick,
	trackFixWithAssistantNudgeViewed,
} from '../workflowErrorNudge.telemetry';

const i18n = useI18n();
const router = useRouter();
const settingsStore = useSettingsStore();
const { openWorkflow } = useInstanceAiHandoffCapability();
const currentWorkflowId = useWorkflowId();
const nudgeActive = computed(
	() =>
		isWorkflowErrorNudgeVisible.value &&
		workflowErrorNudgeWorkflowId.value === currentWorkflowId.value,
);
const opening = ref(false);
const actionRef = ref<HTMLElement | null>(null);
const embedHost = ref<HTMLElement | null>(null);
const outline = ref<NudgeOutline>();

let mutationObserver: MutationObserver | undefined;
let cardResizeObserver: ResizeObserver | undefined;

let strokePx = 0;

function readCssPx(element: HTMLElement, declaration: string): number {
	const probe = document.createElement('div');
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	probe.style.pointerEvents = 'none';
	probe.style.height = '0';
	probe.style.width = declaration;
	element.appendChild(probe);
	const px = probe.getBoundingClientRect().width;
	probe.remove();
	return px;
}

function outlineElement(): HTMLElement | null {
	const button = actionRef.value?.querySelector('button');
	return button instanceof HTMLElement ? button : null;
}

function updateOutline() {
	const element = outlineElement();
	if (!element) {
		outline.value = undefined;
		return;
	}

	if (strokePx <= 0 && actionRef.value) {
		strokePx = readCssPx(actionRef.value, 'var(--spacing--5xs)');
	}

	const box = element.getBoundingClientRect();
	const style = getComputedStyle(element);
	const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
	const bottomRadius = Number.parseFloat(style.borderBottomLeftRadius) || 0;
	outline.value = buildNudgeOutline({
		width: box.width,
		height: box.height,
		radius,
		bottomRadius,
		stroke: strokePx,
	});
}

function startCardOutline() {
	updateOutline();
	const element = outlineElement();
	if (!element) return;

	cardResizeObserver?.disconnect();
	cardResizeObserver = new ResizeObserver(() => updateOutline());
	cardResizeObserver.observe(element);
}

function stopCardOutline() {
	cardResizeObserver?.disconnect();
	cardResizeObserver = undefined;
	outline.value = undefined;
}

function contentToasts(root: ParentNode): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>('.el-notification.content-toast')];
}

function nudgeToasts(root: ParentNode): HTMLElement[] {
	return [
		...root.querySelectorAll<HTMLElement>(`.el-notification.${WORKFLOW_ERROR_NUDGE_TOAST_CLASS}`),
	];
}

function topmostToast(toasts: HTMLElement[]): HTMLElement | undefined {
	return toasts.reduce<HTMLElement | undefined>((highest, toast) => {
		const edgePx = (element: HTMLElement) => {
			const bottomPx = Number.parseFloat(element.style.bottom);
			const offsetPx = Number.isFinite(bottomPx) ? bottomPx : 0;
			return offsetPx + element.offsetHeight;
		};
		if (!highest || edgePx(toast) >= edgePx(highest)) return toast;
		return highest;
	}, undefined);
}

function toastGroup(toast: HTMLElement): HTMLElement | null {
	const group = toast.querySelector('.el-notification__group');
	return group instanceof HTMLElement ? group : null;
}

function removeEmbedHost() {
	embedHost.value?.remove();
	embedHost.value = null;
}

function syncEmbedHost() {
	const root = document.getElementById('n8n-app') ?? document;
	const toast = topmostToast(nudgeToasts(root));
	const group = toast ? toastGroup(toast) : null;
	if (!group) return;
	if (embedHost.value?.isConnected && embedHost.value.parentElement === group) return;

	removeEmbedHost();
	const host = document.createElement('div');
	group.append(host);
	embedHost.value = host;
	void nextTick(() => restackContentToasts(contentToasts(root)));
	trackFixWithAssistantNudgeViewed(workflowErrorNudgeVariant.value);
}

function startEmbedded() {
	const app = document.getElementById('n8n-app');
	if (app) {
		mutationObserver ??= new MutationObserver(() => syncEmbedHost());
		mutationObserver.observe(app, { childList: true });
	}
	syncEmbedHost();
}

function stopTracking() {
	mutationObserver?.disconnect();
	mutationObserver = undefined;
	stopCardOutline();
	removeEmbedHost();
}

function isAssistantEnabled(): boolean {
	return settingsStore.moduleSettings['instance-ai']?.enabled !== false;
}

async function onFixWithAssistant() {
	if (opening.value) return;
	const assistantEnabled = isAssistantEnabled();
	const open = assistantEnabled
		? openWorkflow
		: async () => {
				await router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
			};
	if (!open) return;

	trackErrorToastFixWithAssistantClick(workflowErrorNudgeVariant.value, assistantEnabled);

	opening.value = true;
	try {
		await open('workflow_error_nudge');
		dismissWorkflowErrorNudge();
	} finally {
		opening.value = false;
	}
}

watch(
	nudgeActive,
	(active) => {
		if (!active) {
			stopTracking();
			return;
		}

		startEmbedded();
	},
	{ immediate: true, flush: 'post' },
);

watch(actionRef, (element) => {
	if (element) startCardOutline();
	else stopCardOutline();
});

onBeforeUnmount(stopTracking);
</script>

<template>
	<div :class="$style.root">
		<Teleport v-if="nudgeActive && embedHost" :to="embedHost">
			<div
				ref="actionRef"
				:class="$style.embed"
				:style="{ '--nudge-border-pass-duration': `${WORKFLOW_ERROR_NUDGE_BORDER_PASS_MS}ms` }"
			>
				<svg
					v-if="outline"
					:class="$style.outline"
					:viewBox="outline.viewBox"
					:width="outline.svgWidth"
					:height="outline.svgHeight"
					:style="{ top: `${-outline.pad}px`, left: `${-outline.pad}px` }"
					preserveAspectRatio="xMinYMin meet"
					aria-hidden="true"
				>
					<path
						:d="outline.strokeD"
						:class="$style.stroke"
						:stroke-width="outline.stroke"
						pathLength="200"
					/>
				</svg>
				<N8nButton
					variant="outline"
					size="small"
					:class="$style.action"
					:loading="opening"
					:label="i18n.baseText('experiments.surfaceAssistantOnWorkflowError.nudge.action')"
					data-test-id="workflow-error-nudge-action"
					@click="onFixWithAssistant"
				>
					<template #icon>
						<N8nAssistantIcon size="medium" />
					</template>
				</N8nButton>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.root {
	display: contents;
}

.embed {
	position: relative;
	overflow: visible;
	margin-top: var(--spacing--sm);
}

.embed .action.action {
	position: relative;
	z-index: 1;
	--button--color: light-dark(var(--color--purple-700), var(--color--purple-300));
	--button--color--background: light-dark(var(--color--purple-50), var(--color--purple-alpha-100));
	--button--color--background-hover: light-dark(
		var(--color--purple-100),
		var(--color--purple-alpha-200)
	);
	--button--color--background-active: light-dark(
		var(--color--purple-200),
		var(--color--purple-alpha-300)
	);
	--button--border-color: light-dark(var(--color--purple-200), var(--color--purple-alpha-300));
	--button--border-color--hover: light-dark(
		var(--color--purple-300),
		var(--color--purple-alpha-400)
	);
	--button--border-color--active: light-dark(
		var(--color--purple-300),
		var(--color--purple-alpha-400)
	);
}

.outline {
	position: absolute;
	z-index: 0;
	display: block;
	overflow: visible;
	pointer-events: none;
}

.stroke {
	fill: none;
	stroke: light-dark(var(--color--purple-500), var(--color--purple-400));
	stroke-linejoin: round;
	stroke-linecap: round;
	opacity: 0;
	stroke-dasharray: 32 400;
	stroke-dashoffset: 36;
	animation:
		nudge-pass var(--nudge-border-pass-duration) linear forwards,
		nudge-pass-fade var(--nudge-border-pass-duration) linear forwards;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
		stroke: none;
	}
}

@keyframes nudge-pass {
	0% {
		stroke-dashoffset: 36;
		animation-timing-function: linear;
	}

	14% {
		stroke-dashoffset: 24;
		animation-timing-function: var(--easing--ease-in);
	}

	68% {
		stroke-dashoffset: -68;
		animation-timing-function: var(--easing--ease-out);
	}

	100% {
		stroke-dashoffset: -100;
	}
}

@keyframes nudge-pass-fade {
	0% {
		opacity: 0;
	}

	14%,
	68% {
		opacity: 1;
	}

	100% {
		opacity: 0;
	}
}
</style>
