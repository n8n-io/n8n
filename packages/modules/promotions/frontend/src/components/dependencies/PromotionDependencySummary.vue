<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { DependencyStop } from '../../composables/usePromotionDependencies';
import type { DependencyWarningCounts } from '../../promotionDependencies';

/**
 * The dependencies in one line, above the changes. It also says why the submit button is
 * disabled, because a disabled button cannot explain itself to keyboard users.
 */
const props = defineProps<{
	direction: PromotionDirection;
	gapCount: number;
	hardBlockCount: number;
	/** Why the dependencies stop the operation. `undefined` when they do not. */
	stop?: DependencyStop;
	/** What does not stop the operation. The summary still names it. */
	warnings?: DependencyWarningCounts;
}>();

const emit = defineEmits<{ view: [] }>();

const i18n = useI18n();

const theme = computed(() => {
	if (props.stop === 'hardBlocks') return 'danger';
	return props.stop ? 'warning' : 'info';
});

const sentences = computed(() => {
	const count = (value: number) => ({
		adjustToNumber: value,
		interpolate: { count: String(value) },
	});
	const parts: string[] = [];
	if (props.hardBlockCount > 0) {
		parts.push(
			i18n.baseText(
				`promotions.dependencies.summary.hardBlocks.${props.direction}`,
				count(props.hardBlockCount),
			),
		);
	}
	if (props.gapCount > 0) {
		parts.push(
			i18n.baseText(
				`promotions.dependencies.summary.gaps.${props.direction}`,
				count(props.gapCount),
			),
		);
	}
	if (props.stop && props.stop !== 'hardBlocks') {
		parts.push(i18n.baseText(`promotions.dependencies.stop.${props.stop}`));
	} else if (!props.stop && props.gapCount > 0) {
		parts.push(i18n.baseText(`promotions.dependencies.summary.incomplete.${props.direction}`));
	}
	// A warning never stops the operation, so its sentence comes last and says that.
	const { broken = 0, other = 0, deletions = 0, resources = 0 } = props.warnings ?? {};
	if (broken > 0) {
		parts.push(i18n.baseText('promotions.dependencies.summary.warnings.broken', count(broken)));
	}
	if (deletions > 0) {
		parts.push(
			i18n.baseText('promotions.dependencies.summary.warnings.deletions', count(deletions)),
		);
	}
	if (resources > 0) {
		parts.push(
			i18n.baseText('promotions.dependencies.summary.warnings.resources', count(resources)),
		);
	}
	if (other > 0) {
		parts.push(i18n.baseText('promotions.dependencies.summary.warnings.other', count(other)));
	}
	return parts.join(' ');
});
</script>

<template>
	<N8nCallout :theme="theme" slim data-test-id="promotion-dependency-summary">
		{{ sentences }}
		<template #trailingContent>
			<N8nButton
				variant="outline"
				size="small"
				data-test-id="promotion-dependency-summary-view"
				@click="emit('view')"
			>
				{{ i18n.baseText('promotions.dependencies.summary.view') }}
			</N8nButton>
		</template>
	</N8nCallout>
</template>
