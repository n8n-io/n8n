<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { PromotionOutsideAccessDependency } from '../promotions.types';

/**
 * What a confirmation says about the dependencies that the operation leaves out. One sentence
 * names the workflows that cannot be published. One list names those workflows, each with the
 * dependencies it misses, so the user sees the effect first and the cause second.
 */
const props = defineProps<{
	dependencies: PromotionOutsideAccessDependency[];
	direction: PromotionDirection;
}>();

const i18n = useI18n();

// The list names the workflows that cannot be published, each with the dependencies it misses.
// A workflow counts once, even when it uses several of the dependencies.
const workflows = computed(() => {
	const byId = new Map<string, { name: string; missing: string[] }>();
	for (const dependency of props.dependencies) {
		for (const { workflows: used } of dependency.consumers) {
			for (const { id, name } of used) {
				const entry = byId.get(id) ?? { name, missing: [] };
				entry.missing.push(dependency.name);
				byId.set(id, entry);
			}
		}
	}
	return [...byId.values()];
});

const lead = computed(() =>
	workflows.value.length > 0
		? i18n.baseText(`promotions.unresolved.lead.${props.direction}`, {
				adjustToNumber: workflows.value.length,
				interpolate: { count: String(workflows.value.length) },
			})
		: i18n.baseText(`promotions.unresolved.lead.none.${props.direction}`, {
				adjustToNumber: props.dependencies.length,
				interpolate: { count: String(props.dependencies.length) },
			}),
);

// With no workflow to list, the dependencies themselves are the rows.
const rows = computed(() =>
	workflows.value.length > 0
		? workflows.value.map(({ name, missing }) => ({ name, detail: describeMissing(missing) }))
		: props.dependencies.map(({ name }) => ({ name, detail: undefined })),
);

function describeMissing(names: string[]) {
	const shown = names.slice(0, 2).join(', ');
	return names.length > 2
		? i18n.baseText('promotions.unresolved.missingMore', {
				interpolate: { names: shown, count: String(names.length - 2) },
			})
		: i18n.baseText('promotions.unresolved.missing', { interpolate: { names: shown } });
}
</script>

<template>
	<div :class="$style.summary" data-test-id="promotion-unresolved-summary">
		<N8nIcon icon="triangle-alert" size="medium" :class="$style.warning" />
		<N8nText color="text-base">{{ lead }}</N8nText>
		<!-- The list always shows. A long one scrolls, so it never pushes the buttons away. -->
		<ul :class="$style.list" data-test-id="promotion-unresolved-list">
			<li v-for="row in rows" :key="row.name" :class="$style.row">
				<N8nText bold size="small" color="text-dark">{{ row.name }}</N8nText>
				<N8nText v-if="row.detail" size="small" color="text-light">{{ row.detail }}</N8nText>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
// Two columns: the icon, then the text. The list sits in the text column, so the sentence heads it.
.summary {
	display: grid;
	grid-template-columns: auto 1fr;
	column-gap: var(--spacing--2xs);
	row-gap: var(--spacing--2xs);
}

.warning {
	margin-top: var(--spacing--5xs);
	color: var(--color--warning);
}

.list {
	grid-column: 2;
	display: flex;
	flex-direction: column;
	max-height: 14rem;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
	border-top: var(--border);
	border-bottom: var(--border);
}

.row {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) 0;

	& + & {
		border-top: var(--border);
	}
}
</style>
