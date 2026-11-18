<script setup lang="ts">
import type { PromotionReferenceTarget } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useCredentialTypeNames } from '../../composables/useCredentialTypeNames';
import {
	targetKindOf,
	usePromotionDependencyLabels,
} from '../../composables/usePromotionDependencyLabels';
import { resourceIcon } from '../../promotionPreview.tree';

/**
 * The resource that a reference points to. It shows only what the report holds: without a
 * project in the report, it names no project.
 */
const props = defineProps<{
	target: Pick<PromotionReferenceTarget, 'id' | 'name' | 'credentialType' | 'project'> & {
		/** A newer server can name a kind that this client does not know. */
		kind: PromotionReferenceTarget['kind'] | (string & {});
	};
	/** A project variable has only a name, so it has no id to show. */
	hideId?: boolean;
}>();

const i18n = useI18n();
const { targetName } = usePromotionDependencyLabels();
const { credentialTypeName } = useCredentialTypeNames();

// The id tells two items apart when the report holds no name or no project for them.
const showId = computed(
	() => !props.hideId && (!props.target.name || !props.target.project),
);
const icon = computed(() => {
	const kind = targetKindOf(props.target.kind);
	return kind === 'other' ? 'box' : resourceIcon(kind);
});
</script>

<template>
	<span :class="$style.target" data-test-id="promotion-dependency-target">
		<N8nIcon :icon="icon" size="small" :class="$style.icon" />
		<span :class="$style.text">
			<N8nText step="xs" bold color="text-dark" :class="$style.name">
				{{ targetName(target) }}
			</N8nText>
			<N8nText v-if="target.credentialType" step="2xs" color="text-light">
				{{ credentialTypeName(target.credentialType) }}
			</N8nText>
			<N8nText
				v-if="showId"
				step="2xs"
				color="text-light"
				:class="$style.id"
				data-test-id="promotion-dependency-target-id"
			>
				{{ i18n.baseText('promotions.dependencies.target.id', { interpolate: { id: target.id } }) }}
			</N8nText>
			<N8nText
				v-if="target.project"
				step="2xs"
				color="text-base"
				data-test-id="promotion-dependency-target-project"
			>
				{{
					i18n.baseText('promotions.dependencies.target.inProject', {
						interpolate: { project: target.project.name },
					})
				}}
			</N8nText>
		</span>
	</span>
</template>

<style module lang="scss">
.target {
	display: inline-flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--icon-color);
}

.text {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	column-gap: var(--spacing--2xs);
	row-gap: var(--spacing--5xs);
	min-width: 0;
}

.name {
	overflow-wrap: anywhere;
}

.id {
	font-family: var(--font-family--monospace);
}
</style>
