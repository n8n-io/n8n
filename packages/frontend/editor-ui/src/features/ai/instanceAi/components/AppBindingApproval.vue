<script lang="ts" setup>
import type { AppBindingMeta } from '@n8n/api-types';
import { N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ApprovalOptionList, { type ApprovalOption } from './ApprovalOptionList.vue';

defineProps<{ appBinding: AppBindingMeta; options: ApprovalOption[] }>();
const emit = defineEmits<{ select: [key: string] }>();

const i18n = useI18n();
</script>

<template>
	<div>
		<div :class="$style.body" data-test-id="instance-ai-app-binding-approval">
			<N8nText tag="div" size="medium" bold>
				{{
					i18n.baseText(
						appBinding.kind === 'dataTable'
							? 'instanceAi.appBinding.dataTable.prompt'
							: 'instanceAi.appBinding.prompt',
					)
				}}
			</N8nText>
			<div :class="$style.row">
				<N8nIcon icon="app-window" size="large" />
				<N8nText size="small" bold data-test-id="instance-ai-app-binding-app">
					{{ appBinding.appName }}
				</N8nText>
				<N8nIcon icon="arrow-right" size="small" color="text-light" />
				<template v-if="appBinding.kind === 'dataTable'">
					<N8nIcon icon="table" size="large" />
					<N8nLink
						:to="`/projects/${appBinding.projectId}/datatables/${appBinding.dataTableId}`"
						new-window
						theme="text"
						size="small"
						bold
						data-test-id="instance-ai-app-binding-data-table"
					>
						{{ appBinding.dataTableName }}
					</N8nLink>
				</template>
				<template v-else>
					<N8nIcon icon="workflow" size="large" />
					<N8nLink
						:to="`/workflow/${appBinding.workflowId}`"
						new-window
						theme="text"
						size="small"
						bold
						data-test-id="instance-ai-app-binding-workflow"
					>
						{{ appBinding.workflowName }}
					</N8nLink>
				</template>
			</div>
			<N8nText
				v-if="appBinding.kind === 'dataTable'"
				tag="div"
				size="small"
				color="text-light"
				data-test-id="instance-ai-app-binding-access"
			>
				{{
					i18n.baseText(
						appBinding.permissions.includes('read')
							? appBinding.permissions.includes('write')
								? 'instanceAi.appBinding.dataTable.access.readWrite'
								: 'instanceAi.appBinding.dataTable.access.read'
							: 'instanceAi.appBinding.dataTable.access.write',
					)
				}}
			</N8nText>
		</div>

		<ApprovalOptionList :options="options" @select="emit('select', $event)" />
	</div>
</template>

<style lang="scss" module>
.body {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}
</style>
