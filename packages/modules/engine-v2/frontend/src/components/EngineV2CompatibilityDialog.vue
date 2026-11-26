<script setup lang="ts">
import { N8nDialog, N8nDialogBody, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { EngineCompatibilityReason } from '../engineV2Check';
import { describeCompatibilityReason } from '../engineV2ReasonText';
import { severityIcon, worstSeverity } from './severityIcon';

const { reasons } = defineProps<{
	reasons: EngineCompatibilityReason[];
}>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();

const isBlocked = computed(() => worstSeverity(reasons) === 'blocking');

const title = computed(() =>
	i18n.baseText(
		isBlocked.value
			? 'engineV2Compatibility.dialog.title'
			: 'engineV2Compatibility.dialog.titleWarnings',
	),
);

const intro = computed(() =>
	i18n.baseText(
		isBlocked.value
			? 'engineV2Compatibility.dialog.intro'
			: 'engineV2Compatibility.dialog.introWarnings',
	),
);

// Blocking reasons first. Each group keeps the order of the check.
const items = computed(() =>
	[
		...reasons.filter((reason) => reason.severity === 'blocking'),
		...reasons.filter((reason) => reason.severity !== 'blocking'),
	].map((reason, index) => ({
		id: `${index}-${reason.code}`,
		...severityIcon(reason.severity),
		...describeCompatibilityReason(reason),
	})),
);
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="medium"
		:header="title"
		data-test-id="engine-v2-compatibility-dialog"
	>
		<N8nDialogBody>
			<N8nText
				tag="p"
				size="small"
				:class="$style.intro"
				data-test-id="engine-v2-compatibility-intro"
			>
				{{ intro }}
			</N8nText>
			<ul :class="$style.reasons">
				<li
					v-for="item in items"
					:key="item.id"
					:class="$style.reason"
					data-test-id="engine-v2-compatibility-reason"
				>
					<N8nIcon :icon="item.icon" :color="item.color" :class="$style.icon" />
					<span>
						<strong v-if="item.nodeName">{{ item.nodeName }}: </strong>{{ item.text }}
					</span>
				</li>
			</ul>
		</N8nDialogBody>
	</N8nDialog>
</template>

<style lang="scss" module>
.intro {
	display: block;
	margin: 0 0 var(--spacing--md);
}

.reasons {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin: 0;
	padding: 0;
	list-style: none;
}

.reason {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
}
</style>
