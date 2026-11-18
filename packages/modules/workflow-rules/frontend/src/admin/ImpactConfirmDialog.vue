<script setup lang="ts">
import type { WorkflowRulesScanResponse } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogClose,
	N8nDialogFooter,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	impact: WorkflowRulesScanResponse | null;
	saving: boolean;
}>();

const emit = defineEmits<{ confirm: []; close: [] }>();

const i18n = useI18n();

const open = computed({
	get: () => props.impact !== null,
	set: (value) => {
		if (!value) emit('close');
	},
});

const totals = computed(() => props.impact?.totals);
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="i18n.baseText('workflowRules.impact.title')"
		size="medium"
	>
		<N8nDialogBody>
			<div v-if="totals" :class="$style.body" data-test-id="workflow-rules-impact">
				<N8nText size="small" tag="p">
					{{
						i18n.baseText('workflowRules.impact.checked', {
							interpolate: { count: totals.workflows },
							adjustToNumber: totals.workflows,
						})
					}}
				</N8nText>
				<N8nCallout
					v-if="totals.publishedWithBlocking > 0"
					theme="warning"
					data-test-id="workflow-rules-impact-published"
				>
					{{
						i18n.baseText('workflowRules.impact.published', {
							interpolate: { count: totals.publishedWithBlocking },
							adjustToNumber: totals.publishedWithBlocking,
						})
					}}
				</N8nCallout>
				<ul :class="$style.list">
					<li>
						{{
							i18n.baseText('workflowRules.impact.blocking', {
								interpolate: { count: totals.workflowsWithBlocking },
								adjustToNumber: totals.workflowsWithBlocking,
							})
						}}
					</li>
					<li>
						{{
							i18n.baseText('workflowRules.impact.warnings', {
								interpolate: { count: totals.workflowsWithWarnings },
								adjustToNumber: totals.workflowsWithWarnings,
							})
						}}
					</li>
				</ul>
				<N8nText size="small" color="text-light" tag="p">
					{{ i18n.baseText('workflowRules.impact.note') }}
				</N8nText>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nDialogClose as-child>
				<N8nButton variant="outline" :label="i18n.baseText('workflowRules.common.cancel')" />
			</N8nDialogClose>
			<N8nButton
				variant="solid"
				:loading="saving"
				:label="i18n.baseText('workflowRules.impact.confirm')"
				data-test-id="workflow-rules-impact-confirm"
				@click="emit('confirm')"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.list {
	margin: 0;
	padding-left: var(--spacing--md);
	font-size: var(--font-size--sm);
}
</style>
