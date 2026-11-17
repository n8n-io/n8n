<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { EngineCompatibilityReason } from '../engineV2Check';
import { describeCompatibilityReason } from '../engineV2ReasonText';

const { reasons } = defineProps<{
	reasons: EngineCompatibilityReason[];
}>();

const i18n = useI18n();

const hasBlockingReason = computed(() => reasons.some((reason) => reason.severity === 'blocking'));

const items = computed(() =>
	reasons.map((reason, index) => ({
		id: `${index}-${reason.code}`,
		nodeName: reason.nodeName,
		text: describeCompatibilityReason(reason),
	})),
);
</script>

<template>
	<N8nCallout
		:theme="hasBlockingReason ? 'danger' : 'warning'"
		data-test-id="engine-v2-compatibility-callout"
	>
		{{
			i18n.baseText(
				hasBlockingReason
					? 'engineV2Compatibility.callout.title'
					: 'engineV2Compatibility.callout.titleWarnings',
			)
		}}
		<ul :class="$style.reasons">
			<li v-for="item in items" :key="item.id" data-test-id="engine-v2-compatibility-reason">
				<strong v-if="item.nodeName">{{ item.nodeName }}: </strong>{{ item.text }}
			</li>
		</ul>
	</N8nCallout>
</template>

<style lang="scss" module>
.reasons {
	margin: var(--spacing--4xs) 0 0;
	padding-left: var(--spacing--md);
	list-style: disc;
}
</style>
