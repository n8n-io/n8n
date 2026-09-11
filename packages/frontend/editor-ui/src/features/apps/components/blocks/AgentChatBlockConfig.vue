<script setup lang="ts">
import { N8nInput, N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentChatBlock } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onMounted, reactive, ref, watch } from 'vue';

import { listAgentsPage } from '@/features/agents/composables/useAgentApi';

type AgentChatBlockData = AgentChatBlock['data'];
type AgentOption = { id: string; name: string; published: boolean };

const props = defineProps<{
	modelValue: Partial<AgentChatBlockData>;
	projectId: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: AgentChatBlockData];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const agentOptions = ref<AgentOption[]>([]);

onMounted(async () => {
	try {
		const { data } = await listAgentsPage(rootStore.restApiContext, props.projectId, {
			take: 250,
			sortBy: 'name:asc',
		});
		agentOptions.value = data.map((agent) => ({
			id: agent.id,
			name: agent.name,
			published: agent.activeVersionId !== null,
		}));
	} catch {
		agentOptions.value = [];
	}
});

const form = reactive({
	agentId: props.modelValue.agentId ?? '',
	welcome: props.modelValue.welcome ?? '',
	placeholder: props.modelValue.placeholder ?? '',
});

watch(
	form,
	() =>
		emit('update:modelValue', {
			agentId: form.agentId,
			...(form.welcome ? { welcome: form.welcome } : {}),
			...(form.placeholder ? { placeholder: form.placeholder } : {}),
		}),
	{ deep: true },
);

const optionLabel = (option: AgentOption) =>
	option.published
		? option.name
		: i18n.baseText('apps.block.agentChat.agent.unpublished', {
				interpolate: { name: option.name },
			});
</script>

<template>
	<div :class="$style.container" data-test-id="agent-chat-block-config">
		<N8nInputLabel
			:label="i18n.baseText('apps.block.agentChat.agent.label')"
			input-name="agent-chat-agent"
		>
			<N8nSelect
				v-model="form.agentId"
				size="medium"
				filterable
				data-test-id="agent-chat-block-agent-select"
			>
				<N8nOption
					v-for="option in agentOptions"
					:key="option.id"
					:value="option.id"
					:label="optionLabel(option)"
					:disabled="!option.published"
				/>
			</N8nSelect>
		</N8nInputLabel>
		<N8nInput
			v-model="form.welcome"
			size="medium"
			type="textarea"
			:rows="2"
			:maxlength="500"
			:placeholder="i18n.baseText('apps.block.agentChat.welcome.placeholder')"
			data-test-id="agent-chat-block-welcome"
		/>
		<N8nInput
			v-model="form.placeholder"
			size="medium"
			:maxlength="100"
			:placeholder="i18n.baseText('apps.block.agentChat.placeholder.placeholder')"
			data-test-id="agent-chat-block-placeholder"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
}
</style>
