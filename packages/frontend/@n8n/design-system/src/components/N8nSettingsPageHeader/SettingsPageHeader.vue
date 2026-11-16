<script setup lang="ts">
import { computed, useSlots, watchEffect } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nExternalLink from '../N8nExternalLink';
import N8nFeatureMaturityBadges from '../N8nFeatureMaturityBadges';
import {
	resolveFeatureMaturityBadges,
	useFeatureMaturityCatalog,
} from '../N8nFeatureMaturityBadges/featureMaturityState';
import N8nHeading from '../N8nHeading';
import N8nText from '../N8nText';

export interface SettingsPageHeaderProps {
	/** Page title. */
	title: string;
	/** Optional 1-2 sentence description. */
	description?: string;
	/**
	 * Whether to render the inline documentation link at the end of the description.
	 * On by default. Set `:show-docs-link="false"` to hide it, including when a URL is set.
	 */
	showDocsLink?: boolean;
	/**
	 * Documentation page for the inline link at the end of the description.
	 * Overrides `docsUrl` on the feature entry.
	 */
	docsUrl?: string;
	/** The underlined link word. Defaults to the localized "documentation". */
	docsLabel?: string;
	/**
	 * Leading copy rendered before the link word. Defaults to the localized "Learn more in the ";
	 * pass `""` when the description already leads into the link.
	 */
	docsLeadingText?: string;
	/** Heading element for the page title. */
	headingTag?: string;
	/**
	 * Feature id from the list the app provides.
	 * The entry decides which badges render beside the title.
	 * The entry's `docsUrl` renders the documentation link when this page sets none.
	 * The id sets the badge test ids. A camelCase id becomes kebab-case.
	 * `context` renders `context-preview-badge` and `context-enterprise-readiness-badge`.
	 */
	feature?: string;
	/** Hide the Preview badge at this callsite. */
	hidePreview?: boolean;
	/** Hide the Limited enterprise readiness badge at this callsite. */
	hideEnterprise?: boolean;
}

defineOptions({ name: 'N8nSettingsPageHeader' });

const props = withDefaults(defineProps<SettingsPageHeaderProps>(), {
	description: undefined,
	showDocsLink: true,
	docsUrl: undefined,
	docsLabel: undefined,
	docsLeadingText: undefined,
	headingTag: 'h1',
	feature: undefined,
	hidePreview: false,
	hideEnterprise: false,
});

const slots = useSlots();
const { t } = useI18n();

const hasDescription = computed(() => Boolean(props.description || slots.description));

// `??` rather than `||`: an explicit empty leading text is a valid way to drop the lead-in.
const resolvedDocsLabel = computed(() => props.docsLabel ?? t('settingsPageHeader.docsLabel'));
const resolvedDocsLeadingText = computed(
	() => props.docsLeadingText ?? t('settingsPageHeader.docsLeadingText'),
);
const catalog = useFeatureMaturityCatalog();
const featureEntry = computed(() =>
	props.feature === undefined ? undefined : catalog.value[props.feature],
);
// The page URL wins. Otherwise the feature entry supplies the documentation page.
const resolvedDocsUrl = computed(() => props.docsUrl ?? featureEntry.value?.docsUrl);
// Default-on means a missing URL still renders a placeholder and warns in development.
// `:show-docs-link="false"` removes the link even when a URL is set.
if (import.meta.env.DEV) {
	watchEffect(() => {
		if (props.showDocsLink && !resolvedDocsUrl.value) {
			console.warn(
				'[N8nSettingsPageHeader] The docs link is enabled but no `docsUrl` was provided. ' +
					'Set `docs-url`, pass a feature whose entry has `docsUrl`, or pass `:show-docs-link="false"` to remove it.',
			);
		}
	});
}
const featureBadges = computed(() =>
	resolveFeatureMaturityBadges(catalog.value, props.feature, {
		preview: props.hidePreview,
		enterprise: props.hideEnterprise,
	}),
);
const showFeatureBadges = computed(
	() => featureBadges.value.showPreview || featureBadges.value.showEnterprise,
);
const showTitleRow = computed(() => showFeatureBadges.value || Boolean(slots.titleTrailing));
</script>

<template>
	<header :class="$style.header">
		<div v-if="showTitleRow" :class="$style.titleRow">
			<N8nHeading :tag="headingTag" :class="$style.title" step="xl" color="text-dark">
				{{ title }}
			</N8nHeading>
			<N8nFeatureMaturityBadges
				v-if="showFeatureBadges"
				:feature="feature"
				:hide-preview="hidePreview"
				:hide-enterprise="hideEnterprise"
			/>
			<slot name="titleTrailing" />
		</div>
		<N8nHeading v-else :tag="headingTag" :class="$style.title" step="xl" color="text-dark">
			{{ title }}
		</N8nHeading>
		<p v-if="hasDescription || showDocsLink" :class="$style.description">
			<slot name="description">
				<N8nText v-if="description" size="medium" color="text-base">{{ description }}</N8nText>
			</slot>
			<!--
				The separating space sits OUTSIDE the nowrap docs phrase so the whole "leading copy +
				link + icon" can wrap to the next line as a single unit; only added after a description.
				The link sits inside the N8nText so it inherits the description's font and line height.
			-->
			<template v-if="showDocsLink"
				>{{ hasDescription ? ' ' : ''
				}}<N8nText size="medium" color="text-base" :class="$style.docsPhrase"
					>{{ resolvedDocsLeadingText
					}}<N8nExternalLink
						inline
						size="small"
						:href="resolvedDocsUrl || undefined"
						:disabled="resolvedDocsUrl ? undefined : true"
						data-test-id="settings-page-header-docs"
						>{{ resolvedDocsLabel }}</N8nExternalLink
					></N8nText
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

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
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

/* Keeps "leading copy + link + icon" together so the docs sentence wraps as a single unit. */
.docsPhrase {
	white-space: nowrap;
}
</style>
