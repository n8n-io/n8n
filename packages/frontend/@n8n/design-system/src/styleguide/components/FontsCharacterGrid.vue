<script setup lang="ts">
import { computed } from 'vue';

import { localeCharacterBlocks } from '../locale-characters';

type FontPair = {
	label: string;
	fontFamily: string;
};

defineProps<{
	previous: FontPair;
	next: FontPair;
}>();

const themes = ['light', 'dark'] as const;

const characters = computed(() => localeCharacterBlocks.flatMap((block) => block.characters));

const glyphLabel = (char: string) => {
	if (char === '\u00A0') {
		return 'NBSP';
	}
	return char;
};
</script>

<template>
	<div :class="$style.preview">
		<section v-for="theme in themes" :key="theme" :class="$style.panel" :data-theme="theme">
			<div :class="$style.pair">
				<article v-for="face in [previous, next]" :key="face.label" :class="$style.column">
					<p :class="$style.faceName">{{ face.label }}</p>
					<div :class="$style.grid" :style="{ fontFamily: face.fontFamily }">
						<div
							v-for="char in characters"
							:key="`${face.label}-${theme}-${char.codePointAt(0)}`"
							:class="$style.cell"
						>
							<span :class="$style.glyph">{{ glyphLabel(char) }}</span>
						</div>
					</div>
				</article>
			</div>
		</section>
	</div>
</template>

<style lang="scss">
/* Previous faces are not on the app stack anymore; load them here for the comparison grids. */
@use '../../css/fonts/inter';
@use '../../css/fonts/commit-mono';
</style>

<style lang="scss" module>
.preview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	margin: 0 0 var(--spacing--xl);
}

.panel {
	padding: var(--spacing--md);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	color: var(--text-color);

	&[data-theme='light'] {
		border: var(--border);
		color-scheme: light;
	}

	&[data-theme='dark'] {
		color-scheme: dark;
	}
}

.pair {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--md);
}

.column {
	min-width: 0;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	color: var(--text-color);
}

.faceName {
	margin: 0 0 var(--spacing--xs);
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(var(--spacing--3xl), 1fr));
	gap: var(--spacing--5xs);
}

.cell {
	display: flex;
	align-items: center;
	justify-content: center;
	aspect-ratio: 1;
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.glyph {
	font-size: var(--font-size--xl);
	line-height: var(--line-height--xs);
}
</style>
