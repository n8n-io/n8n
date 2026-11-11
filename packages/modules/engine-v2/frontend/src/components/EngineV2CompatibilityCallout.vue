<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import type { EngineCompatibilityReason } from '../engineV2Check';

const { reasons } = defineProps<{
	reasons: EngineCompatibilityReason[];
}>();

const i18n = useI18n();

// Keyed by `string`: a newer check can return a code that this map does not know yet.
const REASON_TEXT_KEYS: Partial<Record<string, BaseTextKey>> = {
	'error-workflow': 'engineV2Compatibility.reason.errorWorkflow',
	'redaction-policy': 'engineV2Compatibility.reason.redactionPolicy',
	'end-user-credentials': 'engineV2Compatibility.reason.endUserCredentials',
	'trigger-external-identity': 'engineV2Compatibility.reason.triggerExternalIdentity',
};

const hasBlockingReason = computed(() => reasons.some((reason) => reason.severity === 'blocking'));

const items = computed(() =>
	reasons.map((reason, index) => {
		const key = REASON_TEXT_KEYS[reason.code];
		return {
			id: `${index}-${reason.code}`,
			nodeName: reason.nodeName,
			text: key ? i18n.baseText(key) : reason.message,
		};
	}),
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
