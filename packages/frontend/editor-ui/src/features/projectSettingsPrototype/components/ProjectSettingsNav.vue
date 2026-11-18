<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nScrollArea, N8nText } from '@n8n/design-system';
import { useAppNavigation } from '@/app/components/appNavigation/useAppNavigation';
import ProjectNavSections from './ProjectNavSections.vue';

/**
 * The standard shell's sidebar while a project's settings are open: a back
 * row, then the settings pages. Built like the instance settings sidebar, so
 * the two read as the same kind of place.
 */
const navigation = useAppNavigation();

const back = computed(() => navigation.panelOverride.value?.back);
const sections = computed(() => navigation.sectionsFor(navigation.activeItemId.value));
</script>

<template>
	<div :class="$style.container" data-test-id="proto-project-settings-sidebar">
		<div v-if="back" :class="$style.returnBar">
			<RouterLink :to="back.to" :class="$style.returnButton" data-test-id="proto-settings-back">
				<span :class="$style.arrowIcon">
					<N8nIcon icon="arrow-left" size="small" />
				</span>
				<N8nText bold :class="$style.returnLabel">{{ back.label }}</N8nText>
			</RouterLink>
		</div>
		<N8nScrollArea edge-fade="y" :class="$style.scrollArea">
			<nav :class="$style.items" aria-label="Project settings">
				<ProjectNavSections :sections="sections" />
			</nav>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

/* Mirrors SettingsSidebar, so the two settings areas share one frame. */
.container {
	width: $sidebar-expanded-width;
	height: 100%;
	background-color: var(--menu--color--background);
	border-right: var(--border-width, 1px) solid var(--sidebar--border-color, var(--border-color));
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	overflow: hidden;
}

.scrollArea {
	min-height: 0;
}

.returnBar {
	padding: var(--spacing--2xs) var(--spacing--3xs);
	border-bottom: var(--border);
}

.returnButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: var(--spacing--xl);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	color: var(--text-color);
	text-decoration: none;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--focus--border-color, currentColor);
		outline-offset: -2px;
	}
}

.arrowIcon {
	display: grid;
	place-items: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	flex: none;
}

.returnLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.items {
	padding: var(--spacing--xs) var(--spacing--3xs) var(--spacing--xl);
}
</style>
