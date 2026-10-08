<script setup lang="ts">
import { N8nHeading, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';

import { toHash, type Selection } from '../selection';

/** The header of every page: breadcrumbs, title, actions, a meta line and the verdict row. */
defineProps<{
	/** The path to this page. The last crumb is the page itself and is not a link. */
	crumbs: Array<{ label: string; selection: Selection }>;
	title: string;
}>();
defineSlots<{
	actions?: () => unknown;
	meta?: () => unknown;
	description?: () => unknown;
	verdicts?: () => unknown;
	default?: () => unknown;
}>();
</script>

<template>
	<header :class="$style.header" data-test-id="page-header">
		<nav v-if="crumbs.length > 1" aria-label="Breadcrumbs" :class="$style.crumbs">
			<template v-for="(crumb, at) in crumbs" :key="at">
				<N8nIcon v-if="at > 0" icon="chevron-right" size="xsmall" :class="$style.separator" />
				<!-- N8nLink opens a non-router link in a new tab; a hash link stays in this tab. -->
				<N8nLink
					v-if="at < crumbs.length - 1"
					:to="toHash(crumb.selection)"
					target="_self"
					theme="text"
					size="small"
					:class="$style.crumb"
				>
					{{ crumb.label }}
				</N8nLink>
				<N8nText v-else size="small" color="text-light" aria-current="page" :class="$style.crumb">
					{{ crumb.label }}
				</N8nText>
			</template>
		</nav>
		<div :class="$style.titleRow">
			<N8nHeading tag="h1" size="xlarge">{{ title }}</N8nHeading>
			<div v-if="$slots.actions" :class="$style.actions"><slot name="actions" /></div>
		</div>
		<div v-if="$slots.meta" :class="$style.meta"><slot name="meta" /></div>
		<slot name="description" />
		<div v-if="$slots.verdicts" :class="$style.verdicts" data-test-id="page-verdicts">
			<slot name="verdicts" />
		</div>
		<slot />
	</header>
</template>

<style module>
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.crumbs {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.crumb {
	max-width: calc(var(--spacing--5xl) + var(--spacing--4xl));
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.separator {
	color: var(--icon-color);
}

.titleRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	gap: var(--spacing--2xs);
}

.meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.verdicts {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs) var(--spacing--sm);
}
</style>
