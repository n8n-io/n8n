<script setup lang="ts">
import { N8nBadge, N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useEngineV2FindingsDialog } from '../composables/useEngineV2FindingsDialog';
import { hasBlockingGroup, type EngineV2FindingGroup } from '../engineV2Findings';
import { severityIcon } from './severityIcon';

const { groups } = defineProps<{
	groups: EngineV2FindingGroup[];
}>();

const i18n = useI18n();
const findingsDialog = useEngineV2FindingsDialog();

const severity = computed(() => (hasBlockingGroup(groups) ? 'blocking' : 'warning'));
const icon = computed(() => severityIcon(severity.value));
const badgeVariant = computed(() => (severity.value === 'blocking' ? 'danger' : 'warning'));

const count = computed(() => groups.length);

function countText(key: 'label' | 'labelWithoutCount') {
	return i18n.baseText(`engineV2Compatibility.button.${key}`, {
		adjustToNumber: count.value,
		interpolate: { count: count.value },
	});
}

const accessibleName = computed(() => countText('label'));
const visibleLabel = computed(() => countText('labelWithoutCount'));
</script>

<template>
	<!-- `ignore-key-press-canvas`: the canvas shortcuts skip it, so Enter opens the findings
	and not the panel of the selected node. -->
	<N8nButton
		variant="outline"
		size="small"
		:class="[$style.button, 'ignore-key-press-canvas']"
		:aria-label="accessibleName"
		data-test-id="engine-v2-compatibility-button"
		data-attr="engine-v2-compatibility-button"
		@click="findingsDialog.open()"
	>
		<template #icon>
			<N8nIcon :icon="icon.icon" :color="icon.color" />
		</template>
		<span :class="$style.content" aria-hidden="true">
			<span data-test-id="engine-v2-compatibility-button-label">{{ visibleLabel }}</span>
			<!-- The leading slot takes the count without the badge's text wrapper, whose line
			height puts a digit above the center. -->
			<N8nBadge
				:variant="badgeVariant"
				size="xxsmall"
				:class="$style.count"
				data-test-id="engine-v2-compatibility-button-count"
			>
				<template #leading>
					<span :class="$style.countText">{{ count }}</span>
				</template>
			</N8nBadge>
		</span>
	</N8nButton>
</template>

<style lang="scss" module>
.button {
	box-shadow: var(--shadow--xs);
	pointer-events: auto;
}

.content {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

// A square for one digit, wider for more. Scoped under the button, so it wins over the
// badge's own size class.
.button .count {
	--n8n-badge--padding-inline-start: var(--spacing--4xs);
	--n8n-badge--padding-inline-end: var(--spacing--4xs);

	justify-content: center;
	min-width: var(--height--2xs);
}

.countText {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
}
</style>
