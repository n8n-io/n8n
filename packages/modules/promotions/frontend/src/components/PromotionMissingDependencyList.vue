<script setup lang="ts">
import type { PromotionDependencyWarning, PromotionMissingDependency } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { resourceIcon } from '../promotionPreview.tree';

type Dependency = PromotionMissingDependency | PromotionDependencyWarning;

/**
 * What a Promote leaves out, as a short list for a dialog. A row shows the name, the type and the
 * workflows that use the dependency. The API sends no owner and no project for it.
 */
defineProps<{ dependencies: Dependency[] }>();

const i18n = useI18n();

/** A row names this many workflows. It counts the others. */
const NAMED_WORKFLOWS = 2;

function summary({ kind, consumers }: Dependency) {
	const type = i18n.baseText(`promotions.preview.blockers.type.${kind}`);
	const usedBy = consumers.flatMap(({ workflows }) => workflows.map(({ name }) => name));
	const names = usedBy.slice(0, NAMED_WORKFLOWS).join(', ');
	const more = usedBy.length - NAMED_WORKFLOWS;
	return more > 0
		? i18n.baseText('promotions.missingDependencies.usedByMore', {
				interpolate: { type, names, count: String(more) },
			})
		: i18n.baseText('promotions.missingDependencies.usedBy', { interpolate: { type, names } });
}
</script>

<template>
	<ul :class="$style.list" data-test-id="promotion-missing-dependency-list">
		<li
			v-for="dependency in dependencies"
			:key="`${dependency.kind}:${dependency.id ?? dependency.name}`"
			:class="$style.row"
			data-test-id="promotion-missing-dependency"
		>
			<N8nIcon :icon="resourceIcon(dependency.kind)" size="small" :class="$style.icon" />
			<div :class="$style.text">
				<N8nText step="xs" color="text-dark">{{ dependency.name }}</N8nText>
				<N8nText step="2xs" color="text-light">{{ summary(dependency) }}</N8nText>
			</div>
		</li>
	</ul>
</template>

<style lang="scss" module>
.list {
	max-height: var(--spacing--5xl);
	margin: 0;
	padding: 0;
	border: var(--border);
	border-radius: var(--radius--xs);
	list-style: none;
	overflow-y: auto;
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);

	& + & {
		border-top: var(--border);
	}
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--icon-color);
}

.text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}
</style>
