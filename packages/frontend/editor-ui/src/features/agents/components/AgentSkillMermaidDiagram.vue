<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import {
	MAX_DIAGRAM_LENGTH,
	renderSkillMermaid,
	type SkillMermaidResult,
} from './skillMermaidRenderer';

// Give timelines room for axis labels. On narrow screens, scroll the image instead.
const MIN_RENDER_WIDTH = 800;

const props = defineProps<{ code: string }>();

// Each `renderStart` gets exactly one `renderEnd`, so the parent can count the open renders.
const emit = defineEmits<{
	renderStart: [];
	renderEnd: [outcome: SkillMermaidResult['outcome']];
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const viewport = useTemplateRef<HTMLDivElement>('viewport');
const diagram = ref<{ src: string; width: number; description?: string }>();

watch(
	[viewport, () => props.code, () => uiStore.appliedTheme],
	async ([element, code, theme], _, onCleanup) => {
		diagram.value = undefined;
		if (!element || code.length > MAX_DIAGRAM_LENGTH) return;
		const controller = new AbortController();
		let open = true;
		const end = (outcome: SkillMermaidResult['outcome']) => {
			if (open) emit('renderEnd', outcome);
			open = false;
		};
		emit('renderStart');
		onCleanup(() => {
			controller.abort();
			end('aborted');
		});

		try {
			const result = await renderSkillMermaid(
				code,
				theme === 'dark' ? 'dark' : 'default',
				Math.max(element.clientWidth, MIN_RENDER_WIDTH),
				controller.signal,
			);
			if (result.outcome !== 'rendered' || controller.signal.aborted) {
				end(result.outcome);
				return;
			}

			const { svg } = result;
			const { documentElement } = new DOMParser().parseFromString(svg, 'image/svg+xml');
			const width = Number(documentElement.getAttribute('viewBox')?.trim().split(/\s+/)[2]);
			if (documentElement.localName !== 'svg' || !Number.isFinite(width) || width <= 0) {
				end('failed');
				return;
			}
			const [description, title] = ['desc', 'title'].map((name) =>
				Array.from(documentElement.children)
					.find((element) => element.localName === name)
					?.textContent?.trim(),
			);

			// Display the SVG as an image so its markup and styles stay out of the document.
			diagram.value = {
				src: `data:image/svg+xml,${encodeURIComponent(svg)}`,
				width: Math.ceil(width),
				description: description || title,
			};
			end('rendered');
		} catch {
			// Keep the source visible if the diagram cannot render.
			end('failed');
		}
	},
	{ flush: 'post' },
);
</script>

<template>
	<div ref="viewport" :class="$style.diagram">
		<img
			v-if="diagram"
			:class="$style.image"
			:src="diagram.src"
			:width="diagram.width"
			:alt="diagram.description || i18n.baseText('agents.builder.skills.mermaid.diagram')"
			@error="diagram = undefined"
		/>
		<details v-if="diagram">
			<summary :class="$style.sourceLabel">
				{{ i18n.baseText('agents.builder.skills.mermaid.source') }}
			</summary>
			<slot />
		</details>
		<slot v-else />
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.diagram {
	overflow-x: auto;
}

// Two classes, so that the rule wins over the image rule of the Markdown styles.
.diagram .image {
	display: block;
	// Keep the rendered width. A wide diagram scrolls inside its box.
	max-width: none;
	height: auto;
}

.sourceLabel {
	margin-block: var(--spacing--2xs);
	width: fit-content;
	cursor: pointer;
	border-radius: var(--radius--3xs);

	// The global reset removes the outline of summary elements.
	@include focus.focus-visible-ring-offset;
}
</style>
