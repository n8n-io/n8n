<script setup lang="ts">
import { N8nMenuItem, N8nText, type IMenuItem } from '@n8n/design-system';
import type { AppNavLink, AppNavSection } from '@/app/components/appNavigation/useAppNavigation';
import ProjectSettingsDisclosure from './ProjectSettingsDisclosure.vue';

/**
 * A list of pages in sections, drawn with n8n's own menu rows. The settings
 * sidebar, the column of pages, and the expanded project all use it.
 */
defineProps<{ sections: AppNavSection[] }>();

const toMenuItem = (link: AppNavLink): IMenuItem => ({
	id: link.id,
	label: link.label,
	icon: link.icon,
	preview: link.preview,
	route: { to: link.to },
});
</script>

<template>
	<div :class="$style.sections">
		<div
			v-for="section in sections"
			:key="section.id"
			:class="$style.section"
			:data-test-id="`proto-nav-section-${section.id}`"
		>
			<ProjectSettingsDisclosure v-if="section.disclosure" :disclosure="section.disclosure" />
			<template v-else>
				<N8nText
					v-if="section.title"
					tag="div"
					size="small"
					bold
					color="text-light"
					:class="$style.title"
				>
					{{ section.title }}
				</N8nText>
				<div
					v-for="link in section.links"
					:key="link.id"
					:class="{ [$style.inactive]: !link.active }"
					data-test-id="proto-nav-link"
					:data-active="link.active"
				>
					<N8nMenuItem :item="toMenuItem(link)" :active="link.active" />
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.title {
	padding: var(--spacing--4xs) var(--spacing--3xs);
}

// A router link is marked active on any route below its path. Only our own state counts.
.inactive {
	:global(.router-link-active) {
		background-color: transparent;
	}

	:global(.router-link-active:hover) {
		background-color: var(--background--hover);
	}
}
</style>
