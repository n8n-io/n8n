<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { PromotionOutsideAccessDependency } from '../promotions.types';
import { resourceIcon } from '../promotionPreview.tree';

/**
 * What a confirmation says about the dependencies that the operation leaves out, and the list of
 * them. A dependency outside the access of the user and a credential in a personal project each
 * get their own sentence, because the reason differs.
 */
const props = defineProps<{
	dependencies: PromotionOutsideAccessDependency[];
	direction: PromotionDirection;
}>();

const i18n = useI18n();

const groups = computed(() =>
	(
		[
			{ id: 'outside', items: props.dependencies.filter(({ reason }) => !reason) },
			{ id: 'personal', items: props.dependencies.filter(({ reason }) => reason === 'personal') },
		] as const
	)
		.filter(({ items }) => items.length > 0)
		.map(({ id, items }) => ({
			id,
			lead: i18n.baseText(`promotions.unresolved.body.${id}.${props.direction}`, {
				adjustToNumber: items.length,
			}),
			rows: items.map((dependency) => ({
				name: dependency.name,
				icon: resourceIcon(dependency.kind),
				type: i18n.baseText(`promotions.preview.blockers.type.${dependency.kind}`),
				usedBy: usedBy(dependency),
			})),
		})),
);

function usedBy({ consumers }: PromotionOutsideAccessDependency) {
	const names = [
		...new Set(consumers.flatMap(({ workflows }) => workflows.map(({ name }) => name))),
	];
	const shown = names.slice(0, 2).join(', ');
	return names.length > 2
		? i18n.baseText('promotions.unresolved.usedByMore', {
				interpolate: { names: shown, count: String(names.length - 2) },
			})
		: i18n.baseText('promotions.unresolved.usedBy', { interpolate: { names: shown } });
}
</script>

<template>
	<div :class="$style.summary" data-test-id="promotion-unresolved-summary">
		<div v-for="group in groups" :key="group.id" :class="$style.group">
			<N8nText color="text-base">{{ group.lead }}</N8nText>
			<!-- About five rows show. The rest scroll, so a long list never pushes the buttons away. -->
			<ul :class="$style.list" data-test-id="promotion-unresolved-list">
				<li v-for="row in group.rows" :key="row.name" :class="$style.row">
					<N8nIcon :icon="row.icon" size="small" :class="$style.icon" />
					<span :class="$style.text">
						<N8nText bold size="small" color="text-dark">{{ row.name }}</N8nText>
						<N8nText size="small" color="text-light">{{ row.type }}. {{ row.usedBy }}</N8nText>
					</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<style lang="scss" module>
.summary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.list {
	display: flex;
	flex-direction: column;
	max-height: 14rem;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
	border: var(--border);
	border-radius: var(--radius);
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
	margin-top: var(--spacing--5xs);
	flex-shrink: 0;
}

.text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}
</style>
