<script setup lang="ts">
import { N8nButton, N8nIcon, N8nSendStopButton } from '@n8n/design-system';
import { getClientBrand, MCP_SETTINGS_VIEW, useMCPStore } from '@n8n/frontend-module-mcp';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
	ensurePersonalProjectId,
	useInstanceAiHandoff,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

import {
	useBuildManuallyByDefaultStore,
	type EmptyCanvasConnectOption,
} from '../stores/buildManuallyByDefault.store';

const props = defineProps<{
	/** True while the canvas has no nodes. The composer shows only then. */
	isCanvasEmpty: boolean;
}>();

// The canvas Assistant button that the composer minimizes into.
const ASSISTANT_BUTTON_SELECTOR = '[data-test-id="instance-ai-canvas-action-button"]';

const i18n = useI18n();
const router = useRouter();
const store = useBuildManuallyByDefaultStore();
const { startThread } = useInstanceAiHandoff();

const claudeIcon = getClientBrand('Claude').icon;

const formRef = useTemplateRef<HTMLFormElement>('form');
const flightRef = useTemplateRef<HTMLDivElement>('flight');
const flightDotRef = useTemplateRef<HTMLDivElement>('flightDot');

const prompt = ref('');
const isSending = ref(false);
const hasText = computed(() => prompt.value.trim().length > 0);

/** Start and end of the dot that flies from the composer to the Assistant button. */
const flight = ref<{ x: number; fromY: number; toY: number } | null>(null);

function onShown() {
	store.trackComposerShown();
	void store.refreshConnectedMcpClients();
}

onMounted(() => {
	if (props.isCanvasEmpty) onShown();
});

function prefersReducedMotion() {
	return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

async function flyToAssistantButton() {
	const form = formRef.value;
	const target = document.querySelector(ASSISTANT_BUTTON_SELECTOR);
	if (!form || !target || prefersReducedMotion()) return;

	const formRect = form.getBoundingClientRect();
	const targetRect = target.getBoundingClientRect();
	flight.value = {
		x: targetRect.left + targetRect.width / 2,
		fromY: formRect.top + formRect.height / 2,
		toY: targetRect.top + targetRect.height / 2,
	};
	await nextTick();

	const outer = flightRef.value;
	const dot = flightDotRef.value;
	if (!outer || !dot) {
		flight.value = null;
		return;
	}
	// Timings and keyframes come from the design prototype.
	const timing = { duration: 680, delay: 120, fill: 'both' as const };
	const move = outer.animate(
		[
			{ transform: 'translateY(0)' },
			{ transform: `translateY(${flight.value.toY - flight.value.fromY}px)` },
		],
		{ ...timing, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' },
	);
	dot.animate(
		[
			{ opacity: 0, transform: 'scale(0.55)', offset: 0 },
			{ opacity: 1, transform: 'scale(1.08)', offset: 0.14 },
			{ opacity: 1, transform: 'scale(1)', offset: 0.3 },
			{ opacity: 1, transform: 'scale(0.96)', offset: 0.86 },
			{ opacity: 0, transform: 'scale(0.9)', offset: 1 },
		],
		{ ...timing, easing: 'linear' },
	);
	move.onfinish = () => {
		flight.value = null;
	};
}

// Runs before the re-render, so the composer is still in the DOM when it measures.
watch(
	() => props.isCanvasEmpty,
	(isEmpty, wasEmpty) => {
		if (isEmpty === wasEmpty) return;
		if (isEmpty) {
			onShown();
			return;
		}
		void flyToAssistantButton();
		store.minimizeComposer();
	},
);

async function onSubmit() {
	const message = prompt.value.trim();
	if (!message || isSending.value) return;
	isSending.value = true;
	try {
		const projectId = await ensurePersonalProjectId();
		if (!projectId) return;
		const outcome = await startThread(
			projectId,
			message,
			{ kind: 'user_typed' },
			{ source: 'empty_canvas_composer', origin: 'internal' },
		);
		if (outcome !== 'started') return;
		// Track only a started thread, so failed hand-offs do not count as sends.
		store.trackComposerPromptSent(message);
		prompt.value = '';
	} finally {
		isSending.value = false;
	}
}

function onKeyDown(event: KeyboardEvent) {
	if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
	event.preventDefault();
	void onSubmit();
}

async function onConnectOptionClick(client: EmptyCanvasConnectOption) {
	store.trackConnectOptionClicked(client);
	const failure = await router.push({ name: MCP_SETTINGS_VIEW });
	// The connect dialog lives on the MCP settings page and opens on Claude by default.
	// Open it only after the page loaded, so it never shows on a later visit.
	if (!failure && client === 'claude') useMCPStore().openConnectPopover();
}
</script>

<template>
	<!-- Covers the canvas without catching clicks, so the bar can query the canvas width. -->
	<div :class="$style.root">
		<Transition :name="$style.barTransition">
			<div
				v-if="isCanvasEmpty"
				:class="$style.bar"
				data-test-id="empty-canvas-composer"
				@click.stop
				@mousedown.stop
			>
				<form
					ref="form"
					:class="[$style.form, { [$style.formTyped]: hasText }]"
					@submit.prevent="onSubmit"
				>
					<textarea
						v-model="prompt"
						:class="[$style.textarea, 'ignore-key-press-canvas', 'ignore-key-press-node-creator']"
						rows="3"
						:aria-label="i18n.baseText('experiments.buildManuallyByDefault.composer.label')"
						:placeholder="i18n.baseText('experiments.buildManuallyByDefault.composer.placeholder')"
						:disabled="isSending"
						data-test-id="empty-canvas-composer-input"
						data-attr="empty-canvas-composer-input"
						@keydown="onKeyDown"
					/>
					<N8nSendStopButton
						:disabled="!hasText || isSending"
						send-button-test-id="empty-canvas-composer-send"
						data-attr="empty-canvas-composer-send"
						@send="onSubmit"
					/>
				</form>
				<div
					v-if="store.showConnectRow"
					:class="[$style.connectRow, { [$style.connectRowHidden]: hasText }]"
					:aria-hidden="hasText"
					data-test-id="empty-canvas-composer-connect-row"
				>
					<span :class="$style.connectLabel">
						{{ i18n.baseText('experiments.buildManuallyByDefault.composer.orConnect') }}
					</span>
					<N8nButton
						variant="outline"
						size="medium"
						data-test-id="empty-canvas-composer-connect-claude"
						data-attr="empty-canvas-composer-connect-claude"
						@click="onConnectOptionClick('claude')"
					>
						<span :class="[$style.option, $style.optionClaude]">
							<component
								:is="claudeIcon"
								v-if="claudeIcon"
								:class="$style.claudeIcon"
								aria-hidden="true"
							/>
							{{ i18n.baseText('experiments.buildManuallyByDefault.composer.claude') }}
						</span>
					</N8nButton>
					<N8nButton
						variant="outline"
						size="medium"
						data-test-id="empty-canvas-composer-connect-other"
						data-attr="empty-canvas-composer-connect-other"
						@click="onConnectOptionClick('other_assistants')"
					>
						<span :class="$style.option">
							<N8nIcon icon="mcp" :size="14" aria-hidden="true" />
							{{ i18n.baseText('experiments.buildManuallyByDefault.composer.otherAssistants') }}
						</span>
					</N8nButton>
				</div>
			</div>
		</Transition>
		<Teleport to="body">
			<div
				v-if="flight"
				ref="flight"
				:class="$style.flight"
				:style="{ left: `${flight.x}px`, top: `${flight.fromY}px` }"
				aria-hidden="true"
			>
				<div ref="flightDot" :class="$style.flightDot">
					<N8nIcon icon="n8n-assistant" :size="16" />
				</div>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/common/var';

// Timings and curves come from the design prototype. No duration token matches them.
$ease-grow: cubic-bezier(0.2, 0.8, 0.2, 1);
// No size token fits the 400px width from the design.
$form-width: 400px;
// Space for the canvas zoom controls at the bottom left: up to five buttons, their margin and a gap.
$controls-reserve: 240px;

.root {
	position: absolute;
	inset: 0;
	// The size container starts its own stacking context, so the layer carries the z-index.
	// No z-index token exists. 10 matches the other NodeView canvas overlays.
	z-index: 10;
	container-type: inline-size;
	pointer-events: none;
}

.bar {
	position: absolute;
	left: 50%;
	bottom: var(--spacing--xl);
	translate: -50%;
	transform-origin: 50% 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	width: max-content;
	pointer-events: auto;

	// A centred bar would cover the zoom controls. Move it to the right, like the execute buttons.
	@container (max-width: #{$form-width + $controls-reserve * 2 - 1}) {
		left: auto;
		right: var(--spacing--sm);
		translate: none;
		transform-origin: 100% 100%;
	}
}

.form {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--4xs);
	width: $form-width;
	max-width: calc(100cqw - var(--spacing--xl) * 2);

	@container (max-width: #{$form-width + $controls-reserve * 2 - 1}) {
		max-width: calc(100cqw - #{$controls-reserve} - var(--spacing--sm));
	}
	padding-block: var(--spacing--2xs);
	padding-left: var(--spacing--sm);
	padding-right: var(--spacing--2xs);
	background: var(--background--surface);
	border: var(--border-width, 1px) var(--border-style, solid) var(--border-color--subtle);
	// Half the 48px bar height, so the empty composer is a pill.
	border-radius: var(--radius--xl);
	box-shadow: var(--shadow--xs);
	transition:
		border-radius 240ms $ease-grow,
		padding-left 240ms $ease-grow;
}

.formTyped {
	border-radius: var(--radius--lg);
	padding-left: var(--spacing--xs);
}

.textarea {
	flex: 1;
	min-width: 0;
	height: var(--height--xs);
	margin: 0 0 var(--spacing--4xs);
	padding: 0;
	border: 0;
	outline: none;
	resize: none;
	overflow-y: hidden;
	background: transparent;
	color: var(--text-color);
	font-family: var(--font-family);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--xl);
	transition:
		height 240ms $ease-grow,
		margin-bottom 240ms $ease-grow;

	&::placeholder {
		color: var(--text-color--subtler);
		opacity: 1;
	}

	.formTyped & {
		// Three lines, as in the design.
		height: calc(var(--font-size--md) * var(--line-height--xl) * 3);
		margin-bottom: 0;
		overflow-y: auto;
	}
}

.connectRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	overflow: hidden;
	max-height: var(--height--md);
	margin-top: 0;
	opacity: 1;
	visibility: visible;
	transition:
		opacity var(--duration--snappy) ease-out 80ms,
		max-height 240ms $ease-grow,
		margin-top 240ms $ease-grow;
}

// Collapses the row and cancels the column gap, so the composer grows into the space.
.connectRowHidden {
	max-height: 0;
	margin-top: calc(var(--spacing--2xs) * -1);
	opacity: 0;
	visibility: hidden;
	transition:
		opacity 120ms ease-out,
		max-height 240ms $ease-grow,
		margin-top 240ms $ease-grow,
		visibility 0s linear 240ms;
}

.connectLabel {
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xs);
	white-space: pre;
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.optionClaude {
	gap: var(--spacing--2xs);
}

.claudeIcon {
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	flex-shrink: 0;
}

// The composer slides down and fades out when the canvas gets its first node.
.barTransition {
	&:global(-enter-active) {
		transition:
			opacity 240ms ease-out,
			transform 240ms ease-out;
	}

	&:global(-leave-active) {
		transition:
			opacity 240ms ease-in,
			transform 320ms cubic-bezier(0.4, 0, 1, 1);
	}

	&:global(-enter-from),
	&:global(-leave-to) {
		opacity: 0;
		transform: translateY(var(--spacing--xs)) scale(0.96);
	}

	@media (prefers-reduced-motion: reduce) {
		&:global(-enter-active),
		&:global(-leave-active) {
			transition: none;
		}
	}
}

.flight {
	position: fixed;
	z-index: var.$index-popper;
	pointer-events: none;
}

.flightDot {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--height--lg);
	height: var(--height--lg);
	margin: calc(var(--height--lg) / -2) 0 0 calc(var(--height--lg) / -2);
	border-radius: var(--radius--full);
	background: var(--background--surface);
	border: var(--border-width, 1px) var(--border-style, solid)
		color-mix(in srgb, var(--background--brand) 60%, transparent);
	box-shadow:
		0 0 0 var(--spacing--4xs) color-mix(in srgb, var(--background--brand) 12%, transparent),
		0 var(--spacing--3xs) var(--spacing--lg)
			color-mix(in srgb, var(--background--brand) 25%, transparent);
	color: var(--background--brand);
	opacity: 0;
}
</style>
