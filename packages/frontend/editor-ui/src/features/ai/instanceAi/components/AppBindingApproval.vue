<script lang="ts" setup>
import type { AppBindingMeta } from '@n8n/api-types';
import { N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import ApprovalOptionList, { type ApprovalOption } from './ApprovalOptionList.vue';

const props = defineProps<{ appBindings: AppBindingMeta[]; options: ApprovalOption[] }>();
const emit = defineEmits<{ select: [key: string] }>();

const i18n = useI18n();

// One call binds one kind, so the first binding names the prompt for all of them.
const kind = computed(() => props.appBindings[0]?.kind);

const promptKey = computed(() => {
	switch (kind.value) {
		case 'dataTable':
			return 'instanceAi.appBinding.dataTable.prompt';
		case 'agent':
			return 'instanceAi.appBinding.agent.prompt';
		default:
			return 'instanceAi.appBinding.prompt';
	}
});

function accessKey(binding: AppBindingMeta) {
	if (binding.kind === 'dataTable') {
		return binding.permissions.includes('read')
			? binding.permissions.includes('write')
				? 'instanceAi.appBinding.dataTable.access.readWrite'
				: 'instanceAi.appBinding.dataTable.access.read'
			: 'instanceAi.appBinding.dataTable.access.write';
	}
	if (binding.kind === 'agent') {
		return binding.permissions.includes('chat')
			? binding.permissions.includes('history')
				? 'instanceAi.appBinding.agent.access.chatHistory'
				: 'instanceAi.appBinding.agent.access.chat'
			: 'instanceAi.appBinding.agent.access.history';
	}
	return null;
}
</script>

<template>
	<div>
		<div :class="$style.body" data-test-id="instance-ai-app-binding-approval">
			<N8nText tag="div" size="medium" bold>
				{{ i18n.baseText(promptKey) }}
			</N8nText>
			<div
				v-for="binding in appBindings"
				:key="binding.key"
				:class="$style.binding"
				data-test-id="instance-ai-app-binding"
			>
				<div :class="$style.row">
					<N8nIcon icon="app-window" size="large" />
					<N8nText size="small" bold data-test-id="instance-ai-app-binding-app">
						{{ binding.appName }}
					</N8nText>
					<N8nIcon icon="arrow-right" size="small" color="text-light" />
					<template v-if="binding.kind === 'dataTable'">
						<N8nIcon icon="table" size="large" />
						<N8nLink
							:to="`/projects/${binding.projectId}/datatables/${binding.dataTableId}`"
							new-window
							theme="text"
							size="small"
							bold
							data-test-id="instance-ai-app-binding-data-table"
						>
							{{ binding.dataTableName }}
						</N8nLink>
					</template>
					<template v-else-if="binding.kind === 'agent'">
						<N8nIcon icon="robot" size="large" />
						<N8nLink
							:to="`/projects/${binding.projectId}/agents/${binding.agentId}`"
							new-window
							theme="text"
							size="small"
							bold
							data-test-id="instance-ai-app-binding-agent"
						>
							{{ binding.agentName }}
						</N8nLink>
						<N8nText
							v-if="!binding.published"
							size="small"
							color="warning"
							data-test-id="instance-ai-app-binding-not-published"
						>
							{{ i18n.baseText('apps.connections.agent.notPublished') }}
						</N8nText>
					</template>
					<template v-else>
						<N8nIcon icon="workflow" size="large" />
						<N8nLink
							:to="`/workflow/${binding.workflowId}`"
							new-window
							theme="text"
							size="small"
							bold
							data-test-id="instance-ai-app-binding-workflow"
						>
							{{ binding.workflowName }}
						</N8nLink>
					</template>
				</div>
				<N8nText
					v-if="accessKey(binding)"
					tag="div"
					size="small"
					color="text-light"
					data-test-id="instance-ai-app-binding-access"
				>
					{{ i18n.baseText(accessKey(binding)!) }}
				</N8nText>
			</div>
			<N8nText
				v-if="kind === 'agent'"
				tag="div"
				size="small"
				color="text-light"
				data-test-id="instance-ai-app-binding-approvals"
			>
				{{ i18n.baseText('instanceAi.appBinding.agent.approvals') }}
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

.binding {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}
</style>
