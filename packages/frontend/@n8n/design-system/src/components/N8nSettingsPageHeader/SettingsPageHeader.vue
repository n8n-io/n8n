<script setup lang="ts">
import { computed, useSlots, watchEffect } from 'vue';

import N8nHeading from '../N8nHeading';
import N8nText from '../N8nText';

export interface SettingsPageHeaderProps {
	/** Page title. */
	title: string;
	/** Optional 1-2 sentence description. */
	description?: string;
	/**
	 * Whether to render the inline documentation link at the end of the header. On by default
	 * so every settings page links to docs; set `:show-docs-link="false"` to remove it.
	 */
	showDocsLink?: boolean;
	/** Documentation link target. When omitted (while the link is shown) a dev warning fires. */
	docsUrl?: string;
	/** The underlined link word. */
	docsLabel?: string;
	/** Leading copy rendered before the link word (e.g. "Learn more in the "). */
	docsLeadingText?: string;
	/** Heading element for the page title. */
	headingTag?: string;
}

defineOptions({ name: 'N8nSettingsPageHeader' });

const props = withDefaults(defineProps<SettingsPageHeaderProps>(), {
	description: undefined,
	showDocsLink: true,
	docsUrl: undefined,
	docsLabel: 'documentation',
	docsLeadingText: 'Learn more in the ',
	headingTag: 'h1',
});

const slots = useSlots();

const hasDescription = computed(() => Boolean(props.description || slots.description));

// Default-on means a developer who forgets to wire a docs URL is nudged (not silently broken):
// the link word still renders as a placeholder and a dev-only warning prompts them to act.
if (import.meta.env.DEV) {
	watchEffect(() => {
		if (props.showDocsLink && !props.docsUrl) {
			console.warn(
				'[N8nSettingsPageHeader] The docs link is enabled but no `docsUrl` was provided. ' +
					'Set `docs-url` to your documentation page, or pass `:show-docs-link="false"` to remove it.',
			);
		}
	});
}
</script>

<template>
	<header :class="$style.header">
		<N8nHeading :tag="headingTag" :class="$style.title" step="xl" color="text-dark">
			{{ title }}
		</N8nHeading>
		<p v-if="hasDescription || showDocsLink" :class="$style.description">
			<slot name="description">
				<N8nText v-if="description" size="medium" color="text-base">{{ description }}</N8nText>
			</slot>
			<!--
				The separating space sits OUTSIDE the nowrap docs phrase so the whole "leading copy +
				link + arrow" can wrap to the next line as a single unit; only added after a description.
			-->
			<template v-if="showDocsLink"
				>{{ hasDescription ? ' ' : ''
				}}<span :class="$style.docsPhrase"
					><N8nText size="medium" color="text-base">{{ docsLeadingText }}</N8nText
					><a
						:class="$style.docsLink"
						:href="docsUrl || undefined"
						target="_blank"
						rel="noopener noreferrer"
						data-test-id="settings-page-header-docs"
						><span :class="$style.docsLabel">{{ docsLabel }}</span
						><span aria-hidden="true">↗</span></a
					></span
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
	/*
	 * The 48px gap to the content below is owned and enforced by N8nSettingsLayout
	 * (`.content > header + *`), not by an external margin here, so it stays deterministic
	 * and never relies on margin-collapsing.
	 */
}

.title {
	letter-spacing: var(--letter-spacing--tight);
}

.description {
	margin: 0;
	display: inline;
	/* Intentionally the standard body line-height (lg). */
	line-height: var(--line-height--lg);
}

/* The inline N8nText pieces already use the body line-height (lg); keep them consistent. */
.description :global(.n8n-text) {
	line-height: var(--line-height--lg);
}

/* Keeps "leading copy + link + arrow" together so the docs sentence wraps as a single unit. */
.docsPhrase {
	white-space: nowrap;
}

.docsLink {
	/* Reads as part of the description: same base text color, no link/primary color. */
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	text-decoration: none;
	cursor: pointer;
}

/* Only the link word is underlined; the ↗ indicator (plain span) stays bare. */
.docsLabel {
	text-decoration: underline;
}
</style>
