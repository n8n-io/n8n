<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { DetailSide } from '../../promotionPreview.content';

// Before is the current state of the destination in both directions. The page names the
// branch and the instance, so the canvas labels stay neutral.
defineProps<{ side: DetailSide }>();
const i18n = useI18n();
</script>

<template>
	<N8nText color="text-dark" size="small" compact :class="$style.badge">
		{{ i18n.baseText(`workflowDiff.label.${side}`) }}
	</N8nText>
</template>

<style module lang="scss">
.badge {
	composes: sourceBadge from '../../../../workflows/workflowDiff/workflowDiff.module.scss';
}
</style>
