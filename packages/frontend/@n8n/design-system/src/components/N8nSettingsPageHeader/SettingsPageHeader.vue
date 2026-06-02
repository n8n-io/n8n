<script setup lang="ts">
import { useSlots } from 'vue';

import N8nHeading from '../N8nHeading';
import N8nText from '../N8nText';

export interface SettingsPageHeaderProps {
	/** Page title. */
	title: string;
	/** Optional 1-2 sentence description. */
	description?: string;
	/** Optional inline documentation link label, rendered inline at the end of the description. */
	docsLabel?: string;
	/** Optional documentation link href. The docs link renders only when this is set. */
	docsHref?: string;
	/** Heading element for the page title. */
	headingTag?: string;
}

defineOptions({ name: 'N8nSettingsPageHeader' });

withDefaults(defineProps<SettingsPageHeaderProps>(), {
	description: undefined,
	docsLabel: undefined,
	docsHref: undefined,
	headingTag: 'h1',
});

const slots = useSlots();
</script>

<template>
	<header :class="$style.header">
		<N8nHeading :tag="headingTag" :class="$style.title" step="xl" color="text-dark">
			{{ title }}
		</N8nHeading>
		<p v-if="description || slots.description || docsHref" :class="$style.description">
			<slot name="description">
				<N8nText size="medium" color="text-base">{{ description }}</N8nText>
			</slot>
			<template v-if="docsHref"
				>{{ ' '
				}}<a
					:class="$style.docsLink"
					:href="docsHref"
					target="_blank"
					rel="noopener noreferrer"
					data-test-id="settings-page-header-docs"
					><span :class="$style.docsLabel">{{ docsLabel }}</span
					><span :class="$style.docsArrow" aria-hidden="true">↗</span></a
				></template
			>
		</p>
	</header>
</template>

<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
	/* The header column stays capped even when the layout content is full-width. */
	max-width: var(--settings-content--max-width, 45rem);
	/* Spacing below the header before the content begins. */
	margin-block-end: var(--spacing--2xl);
}

.title {
	letter-spacing: var(--letter-spacing--tight);
}

.description {
	margin: 0;
	display: inline;
}

.docsLink {
	/* Reads as part of the description: same base text color, no link/primary color. */
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	text-decoration: none;
	cursor: pointer;
}

.docsLabel {
	text-decoration: underline;
}

.docsArrow {
	/* The external-link indicator stays un-underlined and sits tight against the word. */
	text-decoration: none;
}
</style>
