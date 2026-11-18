<script setup lang="ts">
import { computed, ref } from 'vue';
import CanvasSleepEffect from '../../packages/frontend/editor-ui/src/features/workflows/canvas/components/delight/CanvasSleepEffect.vue';
import CanvasOrigamiEffect from '../../packages/frontend/editor-ui/src/features/workflows/canvas/components/delight/CanvasOrigamiEffect.vue';

const delay = ref(5);
const reducedMotion = ref(false);
const effectsMounted = ref(true);
const sleepEffects = ref<Array<InstanceType<typeof CanvasSleepEffect>>>([]);
const origami = ref<InstanceType<typeof CanvasOrigamiEffect>>();
const sleeping = computed(() => sleepEffects.value.some((effect) => effect.sleeping));
const nodes = ref([
	{
		id: 'schedule',
		name: 'Every morning',
		detail: 'Schedule Trigger',
		x: 90,
		y: 160,
		icon: 'clock',
		connected: true,
	},
	{
		id: 'http',
		name: 'Get new stories',
		detail: 'HTTP Request',
		x: 300,
		y: 160,
		icon: 'globe',
		connected: true,
	},
	{
		id: 'filter',
		name: 'Worth a read?',
		detail: 'If',
		x: 510,
		y: 160,
		icon: 'split',
		connected: true,
	},
	{
		id: 'slack',
		name: 'Share with the team',
		detail: 'Slack',
		x: 750,
		y: 90,
		icon: 'slack',
		connected: true,
	},
	{
		id: 'archive',
		name: 'Save for later',
		detail: 'Edit Fields',
		x: 750,
		y: 280,
		icon: 'edit',
		connected: true,
	},
	{
		id: 'nap',
		name: 'One more idea',
		detail: 'Code · disconnected',
		x: 100,
		y: 420,
		icon: 'code',
		connected: false,
	},
]);
const edges = [
	['schedule', 'http'],
	['http', 'filter'],
	['filter', 'slack'],
	['filter', 'archive'],
];
const note = ref({
	x: 350,
	y: 430,
	width: 330,
	height: 178,
	text: 'A small moment of quiet.\n\nSend the good stories to the team.\nKeep the rest for a rainy day.',
});
const paths = computed(() =>
	edges.map(([from, to]) => {
		const source = nodes.value.find((node) => node.id === from)!;
		const target = nodes.value.find((node) => node.id === to)!;
		const x = source.x + 92;
		const y = source.y + 46;
		return `M${x},${y} C${x + 65},${y} ${target.x - 65},${target.y + 46} ${target.x},${target.y + 46}`;
	}),
);
function sleepAll() {
	sleepEffects.value.forEach((effect) => effect.sleepNow());
}
function wakeAll() {
	sleepEffects.value.forEach((effect) => effect.wake());
}
function drag(event: PointerEvent, node: { x: number; y: number }) {
	if (!(event.currentTarget instanceof HTMLElement) || event.button !== 0) return;
	const element = event.currentTarget;
	const start = { x: event.clientX, y: event.clientY, left: node.x, top: node.y };
	element.setPointerCapture(event.pointerId);
	const move = (next: PointerEvent) => {
		node.x = Math.max(30, Math.min(850, start.left + next.clientX - start.x));
		node.y = Math.max(40, Math.min(560, start.top + next.clientY - start.y));
	};
	const stop = () => {
		element.removeEventListener('pointermove', move);
		element.removeEventListener('pointerup', stop);
		element.removeEventListener('lostpointercapture', stop);
	};
	element.addEventListener('pointermove', move);
	element.addEventListener('pointerup', stop, { once: true });
	element.addEventListener('lostpointercapture', stop, { once: true });
}
</script>

<template>
	<div class="app-shell">
		<header class="topbar">
			<div class="brand">n8n<span class="brand-dot">✦</span></div>
			<div class="breadcrumb">Personal <span>/</span> <strong>The morning digest</strong></div>
			<span class="local-label">Local canvas demo</span><span class="avatar">K</span>
		</header>
		<nav class="rail" aria-label="Demo navigation">
			<span class="rail-item selected">⌘</span><span class="rail-item">▱</span
			><span class="rail-item">◷</span><span class="rail-item bottom">?</span>
		</nav>
		<main>
			<div class="workflow-tabs">
				<span class="active-tab">Editor</span><span>Executions</span><span>Evaluations</span>
			</div>
			<div class="canvas-heading">
				<div class="eyebrow">HACKMATION / 03</div>
				<h1>A little downtime</h1>
				<p>Even a busy canvas has its quiet moments.</p>
			</div>
			<div class="canvas" data-testid="demo-canvas">
				<svg class="connections" width="100%" height="100%" aria-hidden="true">
					<path v-for="path in paths" :key="path" :d="path" />
					<text x="650" y="154">true</text>
					<text x="650" y="278">false</text>
				</svg>
				<div
					v-for="node in nodes"
					:key="node.id"
					class="workflow-node"
					:class="{ disconnected: !node.connected, trigger: node.icon === 'clock' }"
					:style="{ left: `${node.x}px`, top: `${node.y}px` }"
					:data-node-id="node.id"
					tabindex="0"
					:aria-label="node.name"
					@pointerdown="drag($event, node)"
				>
					<span v-if="node.icon !== 'clock'" class="port input"></span
					><span class="port output"></span>
					<svg
						viewBox="0 0 48 48"
						class="node-icon"
						:class="node.icon"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<template v-if="node.icon === 'clock'">
							<circle cx="24" cy="24" r="15" />
							<path d="M24 14v11l7 4" />
						</template>
						<template v-else-if="node.icon === 'globe'">
							<circle cx="24" cy="24" r="15" />
							<ellipse cx="24" cy="24" rx="7" ry="15" />
							<path d="M10 19h28M10 29h28" />
						</template>
						<template v-else-if="node.icon === 'split'">
							<path d="M9 24h12l10-12h8M21 24l10 12h8M35 8l4 4-4 4M35 32l4 4-4 4" />
						</template>
						<template v-else-if="node.icon === 'edit'">
							<path d="m14 32 2-10L33 5l10 10-17 17-12 2ZM29 9l10 10M8 14v26h26v-8" />
						</template>
						<template v-else-if="node.icon === 'code'">
							<path d="m16 14-11 10 11 10m16-20 11 10-11 10M28 10l-8 28" />
						</template>
						<template v-else>
							<path stroke="#36c5f0" stroke-width="7" d="M18 6v12H6" />
							<path stroke="#2eb67d" stroke-width="7" d="M30 6v12h12" />
							<path stroke="#e01e5a" stroke-width="7" d="M6 30h12v12" />
							<path stroke="#ecb22e" stroke-width="7" d="M30 42V30h12" />
						</template>
					</svg>
					<CanvasSleepEffect
						v-if="effectsMounted"
						ref="sleepEffects"
						:eligible="!node.connected"
						:delay="delay * 1000"
						:reduced-motion="reducedMotion"
					/>
					<div class="node-caption">
						<strong>{{ node.name }}</strong
						><small>{{ node.detail }}</small>
					</div>
				</div>
				<div class="note-position" :style="{ left: `${note.x}px`, top: `${note.y}px` }">
					<CanvasOrigamiEffect
						ref="origami"
						:enabled="effectsMounted"
						label="Fold into a paper bird"
						:reduced-motion="reducedMotion"
					>
						<div
							class="sticky-note"
							data-testid="note-content"
							:style="{ width: `${note.width}px`, height: `${note.height}px` }"
						>
							<div class="note-kicker">THE MORNING DIGEST</div>
							<p>{{ note.text }}</p>
							<small>Try the folded corner ↗</small>
						</div>
					</CanvasOrigamiEffect>
				</div>
				<div class="canvas-hint">Drag a node to rearrange <span>·</span> Move or type to wake</div>
			</div>
		</main>
		<aside class="demo-panel">
			<div class="eyebrow">CANVAS DELIGHT</div>
			<h2>Small surprises.<br />Same workflow.</h2>
			<p class="intro">Two tiny easter eggs for the space between ideas.</p>
			<section>
				<div class="section-label"><span>01</span> Sleeping nodes</div>
				<p>Leave a disconnected node alone. Watch it breathe, then move your pointer to wake it.</p>
				<div class="button-row">
					<button class="primary" :disabled="!effectsMounted" @click="sleepAll">Sleep now</button
					><button :disabled="!effectsMounted" @click="wakeAll">Wake</button>
				</div>
				<label class="delay-label" for="delay"
					>Sleep after <strong>{{ delay }} seconds</strong></label
				><input id="delay" v-model.number="delay" type="range" min="2" max="30" step="1" />
				<div class="state" :class="{ sleeping }">
					<span></span>{{ sleeping ? 'Resting for a moment' : 'Ready when you are' }}
				</div>
			</section>
			<section>
				<div class="section-label"><span>02</span> A note takes flight</div>
				<p>
					Touch the note’s folded corner. A paper bird takes a short trip and returns as your
					original note.
				</p>
				<button
					class="wide"
					:disabled="!effectsMounted || origami?.active"
					@click="origami?.fold()"
				>
					{{ origami?.active ? 'Returning shortly…' : 'Fold the note' }}<span>↗</span></button
				><small class="preserved">Your words stay exactly where you left them.</small>
			</section>
			<div class="settings">
				<label><input v-model="reducedMotion" type="checkbox" /> Reduce motion</label
				><label><input v-model="effectsMounted" type="checkbox" /> Enable effects</label>
			</div>
			<p class="footer-note">Local presentation only<br />No workflow execution</p>
		</aside>
	</div>
</template>
