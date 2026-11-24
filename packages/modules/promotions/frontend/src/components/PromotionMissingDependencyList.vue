<script setup lang="ts">
import type { PromotionDependencyWarning, PromotionMissingDependency } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { promoteGroupStatus, type PromoteGroupStatus } from '../promotionDependencyStatus';
import { resourceIcon } from '../promotionPreview.tree';

type Dependency = PromotionMissingDependency | PromotionDependencyWarning;

/**
 * What a Promote or an Apply leaves unresolved, as a short list for a dialog. A row shows the
 * name, the type and the workflows that use the dependency. It shows no owner and no project.
 */
const props = defineProps<{
	dependencies: Dependency[];
	/**
	 * True for a dialog that has no Issues tab. A row then says if the user can access the
	 * dependency, with the status that the Issues tab shows for its group.
	 */
	showStatus?: boolean;
}>();

const i18n = useI18n();

const statusLabel = (key: PromoteGroupStatus) =>
	i18n.baseText(`promotions.preview.blockers.status.${key}`);

// A warning has no group, and so no status.
const statuses = computed(() =>
	props.dependencies.map((dependency) => {
		if (!props.showStatus || !('group' in dependency)) return undefined;
		const status = promoteGroupStatus(dependency.group);
		if (!status) return undefined;
		// The group of a personal project does not say if the user can access that project.
		const keys: PromoteGroupStatus[] =
			status.key === 'personal' && !dependency.accessible ? [status.key, 'outside'] : [status.key];
		return { ...status, label: keys.map(statusLabel).join(' · ') };
	}),
);

// One dependency can have an entry for each reason and for each condition on the selection.
const rowKey = (dependency: Dependency) =>
	[
		dependency.kind,
		dependency.id ?? dependency.name,
		'reason' in dependency ? dependency.reason : dependency.code,
		'condition' in dependency ? (dependency.condition ?? '') : '',
	].join(':');

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
			v-for="(dependency, index) in dependencies"
			:key="rowKey(dependency)"
			:class="$style.row"
			data-test-id="promotion-missing-dependency"
		>
			<N8nIcon :icon="resourceIcon(dependency.kind)" size="small" :class="$style.icon" />
			<div :class="$style.text">
				<N8nText step="xs" color="text-dark">{{ dependency.name }}</N8nText>
				<N8nText step="2xs" color="text-light">{{ summary(dependency) }}</N8nText>
			</div>
			<N8nText
				v-if="statuses[index]"
				step="2xs"
				:class="[$style.status, $style[statuses[index].tone]]"
				data-test-id="promotion-missing-dependency-status"
			>
				<N8nIcon :icon="statuses[index].icon" size="small" />
				{{ statuses[index].label }}
			</N8nText>
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

.status {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	align-self: center;
	gap: var(--spacing--4xs);
	margin-left: auto;
	white-space: nowrap;
}

.neutral {
	color: var(--text-color--subtler);
}

.warning {
	color: var(--text-color--warning);
}
</style>
