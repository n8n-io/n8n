<script lang="ts" setup="">
import type { ExecutionStatus } from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
	status: ExecutionStatus;
	concurrencyCap: number;
}>();

const i18n = useI18n();
</script>

<template>
	<N8nTooltip placement="top">
		<template #content>
			<i18n-t
				v-if="props.status === 'waiting'"
				keypath="executionsList.statusTooltipText.theWorkflowIsWaitingIndefinitely"
			/>
			<i18n-t
				v-if="props.status === 'new'"
				keypath="executionsList.statusTooltipText.waitingForConcurrencyCapacity"
			>
				<template #instance>
					<slot name="content">
						<i18n-t keypath="executionsList.statusTooltipText.waitingForConcurrencyCapacity.self">
							<template #concurrencyCap>{{ props.concurrencyCap }}</template>
							<template #link>
								<N8nLink
									:class="$style.link"
									:href="i18n.baseText('executions.concurrency.docsLink')"
									target="_blank"
									>{{ i18n.baseText('generic.viewDocs') }}</N8nLink
								>
							</template>
						</i18n-t>
					</slot>
				</template>
			</i18n-t>
		</template>
		<slot />
	</N8nTooltip>
</template>

<style lang="scss" module>
.link {
	display: inline-block;
	margin-top: var(--spacing-xs);
}
</style>
