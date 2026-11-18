<script setup lang="ts">
import { computed, ref } from 'vue';
import ConstellationView from '../ConstellationView.vue';
import { createConstellation } from '../graph';
import { sampleWorkflow } from './sample';
import en from '../../../../../../../../@n8n/i18n/src/locales/en.json';
import { isRecord } from '@n8n/utils/is-record';

const workflow = ref<unknown>(sampleWorkflow);
const name = ref(sampleWorkflow.name);
const importError = ref('');
const graph = computed(() => createConstellation(workflow.value));
const copy = {
	open: en['hackmation.constellation.open'],
	title: en['hackmation.constellation.title'],
	eyebrow: en['hackmation.constellation.eyebrow'],
	subtitle: en['hackmation.constellation.subtitle'],
	close: en['hackmation.constellation.close'],
	labels: en['hackmation.constellation.labels'],
	grid: en['hackmation.constellation.grid'],
	svg: en['hackmation.constellation.svg'],
	png: en['hackmation.constellation.png'],
	busy: en['hackmation.constellation.busy'],
	error: en['hackmation.constellation.error'],
	empty: en['hackmation.constellation.empty'],
	caption: en['hackmation.constellation.caption'],
	footer: en['hackmation.constellation.footer'],
};
async function importWorkflow(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;
	try {
		const value: unknown = JSON.parse(await input.files[0].text());
		createConstellation(value);
		workflow.value = value;
		name.value =
			isRecord(value) && typeof value.name === 'string' ? value.name : 'Imported workflow';
		importError.value = '';
	} catch {
		importError.value = 'The workflow could not be opened. Choose an n8n workflow JSON file.';
	}
	input.value = '';
}
function reset() {
	workflow.value = sampleWorkflow;
	name.value = sampleWorkflow.name;
	importError.value = '';
}
</script>

<template>
	<div class="demo-shell">
		<header class="demo-header">
			<div class="demo-brand">n8n<span>/</span><span class="demo-wordmark">Hackmation</span></div>
			<span class="demo-local">LOCAL PLAYGROUND</span>
		</header>
		<main>
			<section class="demo-intro">
				<p class="demo-kicker">01 / WORKFLOW CONSTELLATION</p>
				<h1>Every connection<br />has a little <em>wonder.</em></h1>
				<p>Step back from the canvas. See your workflow as a sky full of possibilities.</p>
			</section>
			<section class="demo-editor" aria-label="Workflow preview">
				<div class="demo-toolbar">
					<div class="demo-workflow-name">
						<span class="demo-folder">⌘</span><span>{{ name }}</span
						><span class="demo-saved">Local preview</span>
					</div>
					<ConstellationView :workflow="workflow" :copy="copy" show-trigger />
				</div>
				<div class="demo-tabs">
					<span class="demo-tab-active">Editor</span><span>Executions</span><span>Evaluations</span>
				</div>
				<div class="demo-canvas">
					<svg viewBox="130 100 1340 700" role="img" aria-label="Sample workflow graph">
						<g fill="none" stroke="#697180" stroke-width="2">
							<path
								v-for="(edge, index) in graph.connections"
								:key="index"
								:d="`M${graph.stars[edge.from].x} ${graph.stars[edge.from].y} C${(graph.stars[edge.from].x + graph.stars[edge.to].x) / 2} ${graph.stars[edge.from].y}, ${(graph.stars[edge.from].x + graph.stars[edge.to].x) / 2} ${graph.stars[edge.to].y}, ${graph.stars[edge.to].x} ${graph.stars[edge.to].y}`"
							/>
						</g>
						<g
							v-for="(star, index) in graph.stars"
							:key="index"
							:transform="`translate(${star.x} ${star.y})`"
						>
							<rect
								x="-29"
								y="-29"
								width="58"
								height="58"
								rx="12"
								fill="#242730"
								stroke="#575d6c"
								stroke-width="1.5"
							/>
							<text
								text-anchor="middle"
								y="9"
								:fill="['#f6b773', '#7bb8ff', '#b6d89c', '#bd9bea'][index % 4]"
								font-size="25"
							>
								{{
									['ϟ', '↗', '⑂', '◇', '⑂', '▤', '▤', '⋈', '✉', '◉', '≡', '⌘', '◈'][index % 13]
								}}
							</text>
							<circle cx="-31" cy="0" r="3" fill="#8c93a1" />
							<circle cx="31" cy="0" r="3" fill="#8c93a1" />
							<text
								text-anchor="middle"
								y="49"
								fill="#d4d7df"
								font-size="12"
								font-family="system-ui"
							>
								{{ star.name }}
							</text>
						</g>
					</svg>
					<div v-if="!graph.stars.length" class="demo-empty">This workflow has no nodes</div>
					<div class="demo-canvas-bottom">
						<span>− &nbsp; 100% &nbsp; +</span
						><span
							>{{ graph.stars.length }} nodes · {{ graph.connections.length }} connections</span
						>
					</div>
				</div>
			</section>
			<footer class="demo-footer">
				<div>
					<span class="demo-spark">✧</span> Try the hidden entrance: type <kbd>stardust</kbd> on the
					canvas
				</div>
				<div class="demo-actions">
					<button type="button" @click="reset">Reset sample</button
					><label class="demo-import"
						>Import workflow JSON<input
							type="file"
							accept="application/json,.json"
							@change="importWorkflow"
					/></label>
				</div>
			</footer>
			<p v-if="importError" role="alert">{{ importError }}</p>
		</main>
	</div>
</template>

<style lang="scss">
@use '../../../../../../../../@n8n/design-system/src/css/primitives';
/* These colors form the isolated demo shell. The application keeps its own theme. */
:root {
	color-scheme: dark;
	font-family: Inter, system-ui, sans-serif;
	color: #e9e9ee;
	background: #101115;
}
* {
	box-sizing: border-box;
}
body {
	margin: 0;
}
button,
input {
	font: inherit;
}
.demo-header {
	height: var(--spacing--3xl);
	padding: 0 var(--spacing--2xl);
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid #2a2b32;
}
.demo-brand {
	color: #ff8c81;
	font-weight: 700;
	font-size: var(--font-size--xl);
	display: flex;
	gap: var(--spacing--lg);
	align-items: center;
}
.demo-brand > span {
	color: #55565e;
	font-weight: 300;
}
.demo-brand .demo-wordmark {
	color: #c7c8d0;
	font-weight: 450;
	font-size: var(--font-size--sm);
}
.demo-local,
.demo-kicker {
	color: #8d8f9b;
	font-size: var(--font-size--3xs);
	letter-spacing: 0.18em;
}
main {
	max-width: 1440px;
	padding: var(--spacing--xl) var(--spacing--2xl);
	margin: auto;
}
.demo-intro {
	padding: var(--spacing--sm) 0 var(--spacing--xl);
}
.demo-kicker {
	color: #b5a6db;
	margin: 0 0 var(--spacing--sm);
}
.demo-intro h1 {
	font-size: clamp(2rem, 3.2vw, 3.5rem);
	font-weight: 450;
	line-height: 1.08;
	letter-spacing: -0.04em;
	margin: 0 0 var(--spacing--sm);
}
.demo-intro em {
	font-family: Georgia, serif;
	color: #c8b9eb;
	font-weight: 400;
}
.demo-intro > p:last-child {
	color: #91939f;
	font-size: var(--font-size--sm);
	margin: 0;
}
.demo-editor {
	border: 1px solid #35353e;
	border-radius: var(--radius--lg);
	overflow: hidden;
	box-shadow: 0 24px 70px #0004;
}
.demo-toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm) var(--spacing--lg);
	background: #1b1c22;
	gap: var(--spacing--sm);
}
.demo-workflow-name {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	font-size: var(--font-size--sm);
}
.demo-folder {
	color: #9699aa;
}
.demo-saved {
	font-size: var(--font-size--3xs);
	color: #8c919f;
}
.demo-tabs {
	display: flex;
	justify-content: center;
	gap: var(--spacing--xl);
	background: #1b1c22;
	font-size: var(--font-size--2xs);
	color: #9295a3;
	border-bottom: 1px solid #30313a;
}
.demo-tabs span {
	padding: var(--spacing--xs) 0;
}
.demo-tab-active {
	color: #ff9b8f;
	border-bottom: 2px solid #ff9b8f;
}
.demo-canvas {
	position: relative;
	background-color: #17181e;
	background-image: radial-gradient(#41414c 0.7px, transparent 0.7px);
	background-size: var(--spacing--sm) var(--spacing--sm);
}
.demo-canvas svg {
	width: 100%;
	display: block;
	height: clamp(300px, 41vh, 520px);
}
.demo-canvas-bottom {
	display: flex;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--lg);
	font-size: var(--font-size--3xs);
	color: #8a8c9b;
}
.demo-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--lg);
	padding-top: var(--spacing--lg);
	color: #9698a6;
	font-size: var(--font-size--2xs);
}
.demo-spark {
	color: #c3afe9;
	font-size: var(--font-size--xl);
	margin-right: var(--spacing--2xs);
}
kbd {
	font: inherit;
	color: #c6bbde;
	border-bottom: 1px solid #716582;
	padding: var(--spacing--4xs);
}
.demo-actions {
	display: flex;
	gap: var(--spacing--lg);
}
.demo-actions button,
.demo-import {
	color: #c4c4ce;
	background: transparent;
	border: 0;
	padding: var(--spacing--2xs) 0;
	font-size: var(--font-size--2xs);
	cursor: pointer;
}
.demo-import input {
	width: 1px;
	height: 1px;
	position: absolute;
	opacity: 0;
}
.demo-import:focus-within {
	outline: 2px solid #c6bbde;
	outline-offset: 4px;
}
.demo-empty {
	position: absolute;
	inset: 40%;
	width: max-content;
	color: #9698a6;
}
@media (max-width: 700px) {
	main {
		padding: var(--spacing--lg) var(--spacing--sm);
	}
	.demo-header {
		padding: 0 var(--spacing--sm);
	}
	.demo-saved {
		display: none;
	}
	.demo-footer {
		flex-wrap: wrap;
	}
	.demo-toolbar {
		padding: var(--spacing--xs);
	}
}
</style>
