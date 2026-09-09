<script lang="ts" setup>
import { N8nCollapsiblePanel, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { JSONSchema7 } from 'json-schema';
import { ref } from 'vue';
import ApprovalOptionList, { type ApprovalOption } from './ApprovalOptionList.vue';

// mirrors @n8n/api-types; integrator swaps
export interface AppBindingMeta {
	appId: string;
	appName: string;
	appNamespace: string;
	workflowId: string;
	workflowName: string;
	key: string;
	inputSchema: JSONSchema7;
	outputSchema: JSONSchema7;
}

defineProps<{ appBinding: AppBindingMeta; options: ApprovalOption[] }>();
const emit = defineEmits<{ select: [key: string] }>();

const i18n = useI18n();
const inputOpen = ref(false);
const outputOpen = ref(false);

const formatSchema = (schema: JSONSchema7) => JSON.stringify(schema, null, 2);
</script>

<template>
	<div>
		<div :class="$style.body" data-test-id="instance-ai-app-binding-approval">
			<N8nText tag="div" size="medium" bold>
				{{ i18n.baseText('instanceAi.appBinding.prompt') }}
			</N8nText>
			<div :class="$style.row">
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
				<N8nIcon icon="arrow-right" size="small" color="text-light" />
				<N8nIcon icon="app-window" size="large" />
				<N8nText size="small" bold data-test-id="instance-ai-app-binding-app">
					{{ appBinding.appName }}
				</N8nText>
			</div>
			<N8nText tag="div" size="small" color="text-light" data-test-id="instance-ai-app-binding-key">
				{{ i18n.baseText('instanceAi.appBinding.asKey', { interpolate: { key: appBinding.key } }) }}
			</N8nText>
			<N8nText tag="div" size="small">
				{{ i18n.baseText('instanceAi.appBinding.publicNotice') }}
			</N8nText>
			<N8nCollapsiblePanel
				v-model="inputOpen"
				:title="i18n.baseText('instanceAi.appBinding.input')"
				data-test-id="instance-ai-app-binding-input"
			>
				<N8nText tag="pre" size="xsmall" :class="$style.schema">{{
					formatSchema(appBinding.inputSchema)
				}}</N8nText>
			</N8nCollapsiblePanel>
			<N8nCollapsiblePanel
				v-model="outputOpen"
				:title="i18n.baseText('instanceAi.appBinding.output')"
				data-test-id="instance-ai-app-binding-output"
			>
				<N8nText tag="pre" size="xsmall" :class="$style.schema">{{
					formatSchema(appBinding.outputSchema)
				}}</N8nText>
			</N8nCollapsiblePanel>
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

.schema {
	margin: 0;
	padding: var(--spacing--2xs);
	font-family: var(--font-family--monospace);
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
