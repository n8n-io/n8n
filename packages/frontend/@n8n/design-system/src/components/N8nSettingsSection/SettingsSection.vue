<script setup lang="ts">
import { computed, useSlots } from 'vue';

import N8nHeading from '../N8nHeading';
import N8nText from '../N8nText';

export interface SettingsSectionProps {
	/** Optional section title. */
	title?: string;
	/** Optional section description. */
	description?: string;
	/** Heading element for the section title. */
	headingTag?: string;
}

defineOptions({ name: 'N8nSettingsSection' });

const props = withDefaults(defineProps<SettingsSectionProps>(), {
	title: undefined,
	description: undefined,
	headingTag: 'h2',
});

const slots = useSlots();

const hasHeader = computed(() =>
	Boolean(props.title || props.description || slots.title || slots.description),
);
</script>

<template>
	<section :class="$style.section">
		<div v-if="hasHeader" :class="$style.header">
			<slot name="title">
				<N8nHeading v-if="title" :tag="headingTag" step="md" color="text-dark">
					{{ title }}
				</N8nHeading>
			</slot>
			<slot name="description">
				<N8nText v-if="description" size="small" color="text-base">
					{{ description }}
				</N8nText>
			</slot>
		</div>
		<div :class="$style.groups">
			<slot />
		</div>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	/* Enforced section-header (title/description) → body gap: 16px. */
	gap: var(--spacing--sm);
	width: 100%;
}

/*
 * Sections own the enforced vertical separation from a preceding sibling section (32px).
 * Higher specificity than the layout's generic inter-child spacing, so adjacent
 * sections sit 32px apart while the header→content gap stays untouched.
 */
.section + .section {
	margin-block-start: var(--spacing--xl); /* 32px */
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.groups {
	display: flex;
	flex-direction: column;
	/*
	 * Enforced gap between separate row GROUPS within a section: 12px. (Rows WITHIN a single
	 * group are separated by dividers in N8nSettingsRowGroup, not by this gap.)
	 */
	gap: var(--spacing--xs); /* 12px */
}
</style>
