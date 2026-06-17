<script lang="ts" setup="">
import type { ExecutionStatus } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';

import { N8nLink, N8nTooltip } from '@n8n/design-system';
const props = defineProps<{
	status: ExecutionStatus;
	concurrencyCap: number;
	isCloudDeployment?: boolean;
}>();

const emit = defineEmits<{
	goToUpgrade: [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nTooltip placement="top">
		<template #content>
			<I18nT
				v-if="props.status === 'waiting'"
				keypath="executionsList.statusTooltipText.theWorkflowIsWaitingIndefinitely"
				scope="global"
			/>
			<I18nT
				v-if="props.status === 'new'"
				keypath="executionsList.statusTooltipText.waitingForConcurrencyCapacity"
				scope="global"
			>
				<template #instance>
					<I18nT
						v-if="props.isCloudDeployment"
						keypath="executionsList.statusTooltipText.waitingForConcurrencyCapacity.cloud"
						scope="global"
					>
						<template #concurrencyCap>{{ props.concurrencyCap }}</template>
						<template #link>
							<N8nLink bold size="small" :class="$style.link" @click="emit('goToUpgrade')">
								{{ i18n.baseText('generic.upgradeNow') }}
							</N8nLink>
						</template>
					</I18nT>
					<I18nT
						v-else
						keypath="executionsList.statusTooltipText.waitingForConcurrencyCapacity.self"
						scope="global"
					>
						<template #concurrencyCap>{{ props.concurrencyCap }}</template>
						<template #link>
							<N8nLink
								:class="$style.link"
								:href="i18n.baseText('executions.concurrency.docsLink')"
								target="_blank"
								>{{ i18n.baseText('generic.viewDocs') }}</N8nLink
							>
						</template>
					</I18nT>
				</template>
			</I18nT>
		</template>
		<slot />
	</N8nTooltip>
</template>

<style lang="scss" module>
.link {
	display: inline-block;
	margin-top: var(--spacing--xs);
}
</style>
