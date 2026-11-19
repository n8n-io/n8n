<script setup lang="ts">
import { ref, useId, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';

// Above this limit Mermaid draws a size warning instead of the diagram.
const MAX_DIAGRAM_LENGTH = 50_000;

const props = defineProps<{ code: string }>();

const i18n = useI18n();
const uiStore = useUIStore();
const id = `skill-mermaid-${useId()}`;
const diagram = ref<{ src: string; width: number; description?: string }>();

watch(
	[() => props.code, () => uiStore.appliedTheme],
	async ([code, theme], _, onCleanup) => {
		let cancelled = false;
		onCleanup(() => {
			cancelled = true;
		});
		diagram.value = undefined;
		if (code.length > MAX_DIAGRAM_LENGTH) return;

		const container = document.createElement('div');
		try {
			const { default: mermaid } = await import('mermaid');
			if (cancelled) return;
			mermaid.initialize({
				startOnLoad: false,
				securityLevel: 'strict',
				suppressErrorRendering: true,
				maxTextSize: MAX_DIAGRAM_LENGTH,
				htmlLabels: false,
				theme: theme === 'dark' ? 'dark' : 'default',
			});
			const parsed = await mermaid.parse(code, { suppressErrors: true });
			if (cancelled || !parsed || parsed.diagramType === 'error') return;

			// Mermaid needs a mounted element to measure the diagram.
			container.style.position = 'fixed';
			container.style.visibility = 'hidden';
			document.body.append(container);
			const { svg } = await mermaid.render(id, code, container);
			if (cancelled) return;

			const { documentElement } = new DOMParser().parseFromString(svg, 'image/svg+xml');
			const width = Number(documentElement.getAttribute('viewBox')?.trim().split(/\s+/)[2]);
			if (documentElement.localName !== 'svg' || !Number.isFinite(width) || width <= 0) return;
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
		} catch {
			// Keep the source visible if the diagram cannot render.
		} finally {
			container.remove();
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.diagram">
		<img
			v-if="diagram"
			:src="diagram.src"
			:width="diagram.width"
			:alt="diagram.description || i18n.baseText('agents.builder.skills.mermaid.diagram')"
			@error="diagram = undefined"
		/>
		<slot v-else />
	</div>
</template>

<style lang="scss" module>
.diagram {
	overflow-x: auto;

	img {
		display: block;
		height: auto;
	}
}
</style>
