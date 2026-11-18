<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { download, readGraph, renderPng, renderSvg, type Palette, type PrintStyle } from './art';
import { renderStl } from './relief';
import type { StudioCopy } from './copy';
import { sampleWorkflow } from './sample';
import './studio.css';

const props = defineProps<{ workflow: unknown; copy: StudioCopy; allowImport?: boolean }>();
const style = ref<PrintStyle>('blueprint');
const palette = ref<Palette>('original');
const imported = ref<unknown>();
const busy = ref(false);
const status = ref('');
const fileInput = ref<HTMLInputElement>();
const styles: PrintStyle[] = ['blueprint', 'minimal', 'circuit'];
const paletteOptions: Palette[] = ['original', 'warm', 'mono'];
const graph = computed(() => {
	try {
		return readGraph(imported.value ?? props.workflow);
	} catch {
		return null;
	}
});
const svg = computed(() => (graph.value ? renderSvg(graph.value, style.value, palette.value) : ''));
const preview = computed(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.value)}`);
watch(
	() => props.workflow,
	() => {
		imported.value = undefined;
	},
);
async function importFile(event: Event) {
	const target = event.target;
	if (!(target instanceof HTMLInputElement) || !target.files?.[0]) return;
	try {
		const file = target.files[0];
		if (file.size > 5 * 1024 * 1024) throw new Error('size');
		const value: unknown = JSON.parse(await file.text());
		readGraph(value);
		imported.value = value;
		status.value = '';
	} catch {
		status.value = props.copy.importError;
	}
	target.value = '';
}
async function exportArt(format: 'svg' | 'png' | 'stl') {
	if (!graph.value || busy.value) return;
	const filename = `n8n-${format === 'stl' ? 'relief-160x100mm' : `${style.value}-${palette.value}`}.${format}`;
	busy.value = true;
	status.value = props.copy.working;
	try {
		const blob =
			format === 'png'
				? await renderPng(svg.value)
				: format === 'svg'
					? new Blob([svg.value], { type: 'image/svg+xml' })
					: new Blob([renderStl(graph.value)], { type: 'model/stl' });
		download(blob, filename);
		status.value = props.copy.ready;
	} catch {
		status.value = props.copy.exportError;
	} finally {
		busy.value = false;
	}
}
</script>

<template>
	<section class="print-studio" :aria-label="copy.title">
		<header class="ps-heading">
			<div>
				<p class="ps-eyebrow">{{ copy.demo }}</p>
				<h1>{{ copy.title }}<span aria-hidden="true">↗</span></h1>
				<p>{{ copy.intro }}</p>
			</div>
			<div class="ps-index" aria-hidden="true">n8n<br /><span>STUDIO / 001</span></div>
		</header>
		<div class="ps-layout">
			<div class="ps-preview-area">
				<div class="ps-preview-meta">
					<span>{{ copy.preview }}</span
					><span v-if="graph"
						>{{ graph.nodes.length }} {{ copy.nodes }} / {{ graph.edges.length }}
						{{ copy.connections }}</span
					>
				</div>
				<div class="ps-paper-stage">
					<img v-if="graph" class="ps-paper" :src="preview" :alt="copy.preview" />
					<p v-else>{{ copy.empty }}</p>
				</div>
				<p class="ps-dimensions">{{ copy.dimensions }}</p>
			</div>
			<aside class="ps-controls">
				<section>
					<h2><span>01</span>{{ copy.collection }}</h2>
					<div class="ps-style-list">
						<button
							v-for="(option, i) in styles"
							:key="option"
							type="button"
							:class="['ps-style', { selected: style === option }]"
							:aria-pressed="style === option"
							:data-testid="`print-style-${option}`"
							@click="style = option"
						>
							<span :class="['ps-swatch', option]" aria-hidden="true">{{ ['⌘', '●', '▦'][i] }}</span
							><span
								><strong>{{ copy[option] }}</strong
								><small>{{ copy[`${option}Description`] }}</small></span
							><span class="ps-selection" aria-hidden="true">{{
								style === option ? '●' : '○'
							}}</span>
						</button>
					</div>
				</section>
				<section>
					<h2><span>02</span>{{ copy.palette }}</h2>
					<div class="ps-palettes">
						<button
							v-for="option in paletteOptions"
							:key="option"
							type="button"
							:aria-pressed="palette === option"
							:class="{ selected: palette === option }"
							@click="palette = option"
						>
							{{ copy[option] }}
						</button>
					</div>
				</section>
				<section>
					<h2><span>03</span>{{ copy.export }}</h2>
					<div class="ps-downloads">
						<button
							class="ps-primary"
							type="button"
							:disabled="!graph || busy"
							@click="exportArt('png')"
						>
							{{ copy.png }} <span aria-hidden="true">↓</span></button
						><button type="button" :disabled="!graph || busy" @click="exportArt('svg')">
							{{ copy.svg }} <span aria-hidden="true">↓</span>
						</button>
					</div>
					<p class="ps-note">{{ copy.privacy }}</p>
				</section>
				<section class="ps-relief">
					<div class="ps-relief-heading">
						<h3>{{ copy.relief }}</h3>
						<span aria-hidden="true">▱</span>
					</div>
					<p>{{ copy.reliefNote }}</p>
					<button type="button" :disabled="!graph || busy" @click="exportArt('stl')">
						{{ copy.stl }} <span aria-hidden="true">↓</span>
					</button>
				</section>
				<div v-if="allowImport" class="ps-import">
					<input
						ref="fileInput"
						type="file"
						accept=".json,application/json"
						:aria-label="copy.import"
						hidden
						@change="importFile"
					/><button type="button" @click="fileInput?.click()">{{ copy.import }}</button
					><button
						type="button"
						@click="
							imported = sampleWorkflow;
							status = '';
						"
					>
						{{ copy.sample }}
					</button>
				</div>
				<p class="ps-status" role="status">{{ status }}</p>
			</aside>
		</div>
		<footer class="ps-footer">
			<span>{{ copy.shortcut }}</span
			><span aria-hidden="true">{{ copy.signature }}</span>
		</footer>
	</section>
</template>
