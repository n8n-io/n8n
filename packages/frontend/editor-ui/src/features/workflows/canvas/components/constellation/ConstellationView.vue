<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef } from 'vue';
import ConstellationArtwork from './ConstellationArtwork.vue';
import { createConstellation } from './graph';
import { downloadArtwork } from './download';

export interface ConstellationCopy {
	open: string;
	title: string;
	eyebrow: string;
	subtitle: string;
	close: string;
	labels: string;
	grid: string;
	svg: string;
	png: string;
	busy: string;
	error: string;
	empty: string;
	caption: string;
	footer: string;
}

const props = defineProps<{ workflow: unknown; copy: ConstellationCopy; showTrigger?: boolean }>();
const dialog = useTemplateRef('dialog');
const headingId = useId();
const artwork = useTemplateRef('artwork');
const visible = ref(false);
const labels = ref(false);
const grid = ref(true);
const busy = ref(false);
const error = ref(false);
const graph = computed(() => createConstellation(props.workflow));
let previousFocus: Element | null = null;
let sequence = '';
let lastKeyTime = 0;

async function open() {
	if (visible.value) return;
	previousFocus = document.activeElement;
	error.value = false;
	visible.value = true;
	await nextTick();
	dialog.value?.showModal();
}

function close() {
	visible.value = false;
	dialog.value?.close();
	if (previousFocus instanceof HTMLElement) previousFocus.focus();
}

function onKey(event: KeyboardEvent) {
	const target = event.target;
	if (
		visible.value ||
		event.ctrlKey ||
		event.metaKey ||
		event.altKey ||
		event.shiftKey ||
		(target instanceof HTMLElement &&
			(target.isContentEditable ||
				target.closest('input, textarea, select, [role="textbox"], [role="dialog"], dialog')))
	)
		return;
	if (Date.now() - lastKeyTime > 1800) sequence = '';
	lastKeyTime = Date.now();
	if (event.key.length !== 1) {
		sequence = '';
		return;
	}
	const candidate = sequence + event.key;
	sequence = 'stardust'.startsWith(candidate) ? candidate : event.key === 's' ? 's' : '';
	if (!sequence) return;
	// Consume this sequence before canvas shortcuts can change selected nodes.
	event.preventDefault();
	event.stopImmediatePropagation();
	if (sequence === 'stardust') {
		sequence = '';
		void open();
	}
}

async function download(format: 'svg' | 'png') {
	const svg = artwork.value?.querySelector('svg');
	if (!svg) return;
	busy.value = true;
	error.value = false;
	try {
		await downloadArtwork(svg, format);
	} catch {
		error.value = true;
	} finally {
		busy.value = false;
	}
}

onMounted(() => window.addEventListener('keydown', onKey, true));
onBeforeUnmount(() => {
	window.removeEventListener('keydown', onKey, true);
	dialog.value?.close();
});
defineExpose({ open, close });
</script>

<template>
	<div>
		<button
			v-if="showTrigger"
			type="button"
			class="constellation-launch"
			data-testid="constellation-open"
			@click="open"
		>
			<span aria-hidden="true">✧</span> {{ copy.open }}
		</button>
		<Teleport to="body">
			<dialog
				ref="dialog"
				class="constellation-dialog"
				:aria-labelledby="headingId"
				@cancel.prevent="close"
				@keydown.stop
				@keyup.stop
			>
				<div v-if="visible" class="constellation-view">
					<header class="constellation-header">
						<div>
							<p class="constellation-eyebrow">{{ copy.eyebrow }}</p>
							<h1 :id="headingId">{{ copy.title }}</h1>
							<p class="constellation-subtitle">{{ copy.subtitle }}</p>
						</div>
						<button
							type="button"
							class="constellation-close"
							autofocus
							data-testid="constellation-close"
							@click="close"
						>
							{{ copy.close }} <span aria-hidden="true">↗</span>
						</button>
					</header>
					<div ref="artwork" class="constellation-stage">
						<ConstellationArtwork
							v-if="graph.stars.length"
							:graph="graph"
							:labels="labels"
							:grid="grid"
							:title="copy.title"
							:caption="copy.caption"
							:accessible-title="copy.title"
						/>
						<p v-else class="constellation-empty">{{ copy.empty }}</p>
					</div>
					<footer class="constellation-controls">
						<div class="constellation-options">
							<label
								><input v-model="labels" type="checkbox" data-testid="constellation-labels" />
								{{ copy.labels }}</label
							><label
								><input v-model="grid" type="checkbox" data-testid="constellation-grid" />
								{{ copy.grid }}</label
							>
						</div>
						<span class="constellation-note">{{ copy.footer }}</span>
						<div class="constellation-downloads">
							<button
								type="button"
								:disabled="busy || !graph.stars.length"
								data-testid="constellation-svg"
								@click="download('svg')"
							>
								{{ busy ? copy.busy : copy.svg }} <span aria-hidden="true">↓</span></button
							><button
								type="button"
								class="constellation-primary"
								:disabled="busy || !graph.stars.length"
								data-testid="constellation-png"
								@click="download('png')"
							>
								{{ busy ? copy.busy : copy.png }} <span aria-hidden="true">↓</span>
							</button>
						</div>
					</footer>
					<p v-if="error" role="alert" class="constellation-error">{{ copy.error }}</p>
				</div>
			</dialog>
		</Teleport>
	</div>
</template>

<style scoped>
/* The artwork uses its own night palette. App surface tokens follow the active theme. */
.constellation-dialog {
	--night-sky: #070d19;
	--night-panel: #10192a;
	--night-text: #e6edf7;
	--night-muted: #9aabc5;
	--night-line: #29374e;
	--night-accent: #d9e6fc;
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
	max-width: none;
	max-height: none;
	padding: 0;
	margin: 0;
	border: 0;
	color: var(--night-text);
	background: var(--night-sky);
	font-family: Inter, system-ui, sans-serif;
}
.constellation-dialog::backdrop {
	background: var(--night-sky);
}
.constellation-view {
	display: flex;
	flex-direction: column;
	height: 100%;
}
.constellation-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg) var(--spacing--2xl);
	border-bottom: 1px solid var(--night-line);
}
.constellation-eyebrow {
	color: var(--night-muted);
	font-size: var(--font-size--3xs);
	letter-spacing: 0.22em;
	margin: 0 0 var(--spacing--2xs);
}
h1 {
	font-weight: 450;
	font-size: var(--font-size--xl);
	margin: 0;
}
.constellation-subtitle {
	color: var(--night-muted);
	font-size: var(--font-size--2xs);
	margin: var(--spacing--2xs) 0 0;
}
.constellation-stage {
	flex: 1;
	min-height: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--sm) var(--spacing--xl);
	overflow: hidden;
}
.constellation-controls {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg) var(--spacing--2xl);
	border-top: 1px solid var(--night-line);
	font-size: var(--font-size--2xs);
}
.constellation-options,
.constellation-downloads {
	display: flex;
	align-items: center;
	gap: var(--spacing--lg);
}
.constellation-options label {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
}
input {
	accent-color: var(--night-accent);
}
button {
	border: 1px solid var(--night-line);
	background: var(--night-panel);
	color: var(--night-text);
	border-radius: var(--radius--xs);
	font: inherit;
	font-size: var(--font-size--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	cursor: pointer;
}
button span {
	margin-left: var(--spacing--xs);
}
button:hover {
	border-color: var(--night-muted);
}
button:focus-visible,
input:focus-visible {
	outline: 2px solid var(--night-accent);
	outline-offset: 4px;
}
button:disabled {
	opacity: 0.5;
	cursor: wait;
}
.constellation-primary {
	color: var(--night-sky);
	background: var(--night-accent);
}
.constellation-close {
	white-space: nowrap;
}
.constellation-note,
.constellation-empty {
	color: var(--night-muted);
}
.constellation-error {
	color: var(--night-text);
	margin: 0;
	padding: var(--spacing--sm);
	text-align: center;
}
.constellation-launch {
	color: var(--text-color, #e6edf7);
	background: var(--background--surface, #10192a);
	border-color: var(--border-color, #29374e);
}
.constellation-launch span {
	margin: 0 var(--spacing--2xs) 0 0;
}
@media (max-width: 800px) {
	.constellation-header {
		padding: var(--spacing--sm);
	}
	.constellation-controls {
		flex-wrap: wrap;
		padding: var(--spacing--sm);
		gap: var(--spacing--sm);
	}
	.constellation-note {
		display: none;
	}
	.constellation-stage {
		padding: 0;
	}
	.constellation-subtitle {
		max-width: 28ch;
	}
}
@media (max-width: 450px) {
	.constellation-controls {
		justify-content: center;
	}
	.constellation-close {
		padding: var(--spacing--xs);
	}
}
</style>
