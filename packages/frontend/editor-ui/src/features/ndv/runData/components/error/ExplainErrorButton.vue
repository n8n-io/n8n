<script setup lang="ts">
import { computed, ref } from 'vue';
import type { NodeError, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nPopover, N8nSpinner, N8nText } from '@n8n/design-system';

import { useExplainErrorStore } from './explainError.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useAIAssistantHelpers } from '@/features/ai/assistant/composables/useAIAssistantHelpers';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';

type ErrorProp = NodeError | NodeApiError | NodeOperationError;

const props = defineProps<{
	error: ErrorProp;
}>();

const i18n = useI18n();
const store = useExplainErrorStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const assistantHelpers = useAIAssistantHelpers();
const workflowId = useInjectWorkflowId();

const open = ref(false);

const state = computed(() => store.state);
const result = computed(() => store.result);

async function buildPayload(): Promise<ChatRequest.InitErrorHelper> {
	const error = props.error;
	const node = error.node;
	if (!node) {
		throw new Error('Cannot explain error without a node');
	}

	const allowParameterValues = settingsStore.settings.ai?.allowSendingParameterValues ?? false;
	const { authType, nodeInputData, schemas } = assistantHelpers.getNodeInfoForAssistant(
		workflowId.value,
		node,
		{ excludeParameterValues: !allowParameterValues },
	);

	return {
		role: 'user',
		type: 'init-error-helper',
		user: {
			firstName: usersStore.currentUser?.firstName ?? '',
		},
		error: assistantHelpers.simplifyErrorForAssistant(error),
		node: await assistantHelpers.processNodeForAssistant(node, ['position', 'parameters.notice'], {
			excludeParameterValues: !allowParameterValues,
		}),
		nodeInputData,
		executionSchema: schemas,
		authType,
		context: {
			aiUsageSettings: { allowSendingParameterValues: allowParameterValues },
		},
	};
}

async function onOpenChange(next: boolean): Promise<void> {
	open.value = next;
	if (next) {
		const payload = await buildPayload();
		await store.explain(props.error, payload);
	}
}

async function onRetry(): Promise<void> {
	const payload = await buildPayload();
	await store.retry(props.error, payload);
}
</script>

<template>
	<N8nPopover
		:open="open"
		side="bottom"
		align="end"
		width="360px"
		:side-offset="8"
		@update:open="onOpenChange"
	>
		<template #trigger>
			<button type="button" class="explain-error-button" data-test-id="explain-error-button">
				<N8nIcon icon="sparkles" size="small" />
				<span>{{ i18n.baseText('nodeErrorView.explain.button') }}</span>
			</button>
		</template>
		<template #content>
			<div class="explain-error-popover" data-test-id="explain-error-popover">
				<header class="explain-error-popover__header">
					<N8nText size="small" bold>
						{{ i18n.baseText('nodeErrorView.explain.popover.title') }}
					</N8nText>
				</header>

				<div v-if="state === 'loading'" class="explain-error-popover__loading">
					<N8nSpinner size="small" />
					<N8nText size="small">
						{{ i18n.baseText('nodeErrorView.explain.popover.loading') }}
					</N8nText>
				</div>

				<div v-else-if="state === 'error'" class="explain-error-popover__error">
					<N8nText size="small">
						{{ i18n.baseText('nodeErrorView.explain.popover.error') }}
					</N8nText>
					<N8nButton
						size="small"
						type="tertiary"
						:label="i18n.baseText('nodeErrorView.explain.popover.retry')"
						@click="onRetry"
					/>
				</div>

				<div
					v-else-if="state === 'ready' && result?.kind === 'structured'"
					class="explain-error-popover__sections"
				>
					<section>
						<N8nText size="xsmall" bold color="text-base">
							{{ i18n.baseText('nodeErrorView.explain.popover.summaryHeading') }}
						</N8nText>
						<N8nText size="small">{{ result.summary }}</N8nText>
					</section>
					<section>
						<N8nText size="xsmall" bold color="text-base">
							{{ i18n.baseText('nodeErrorView.explain.popover.culpritHeading') }}
						</N8nText>
						<N8nText size="small">{{ result.culprit }}</N8nText>
					</section>
					<section>
						<N8nText size="xsmall" bold color="text-base">
							{{ i18n.baseText('nodeErrorView.explain.popover.nextStepHeading') }}
						</N8nText>
						<N8nText size="small">{{ result.nextStep }}</N8nText>
					</section>
				</div>

				<div
					v-else-if="state === 'ready' && result?.kind === 'raw'"
					class="explain-error-popover__sections"
				>
					<N8nText size="small">{{ result.text }}</N8nText>
				</div>

				<footer class="explain-error-popover__footer">
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('nodeErrorView.explain.popover.disclaimer') }}
					</N8nText>
				</footer>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" scoped>
.explain-error-button {
	display: inline-flex;
	gap: var(--spacing--4xs);
	align-items: center;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: var(--color--background--shade-1);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	cursor: pointer;

	&:hover {
		background: var(--color--background--shade-2);
	}
}

.explain-error-popover {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);

	&__header {
		padding-bottom: var(--spacing--3xs);
		border-bottom: 1px solid var(--color--foreground);
	}

	&__loading,
	&__error {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--3xs);
		align-items: flex-start;
	}

	&__sections {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--2xs);

		section {
			display: flex;
			flex-direction: column;
			gap: var(--spacing--5xs);
		}
	}

	&__footer {
		padding-top: var(--spacing--3xs);
		border-top: 1px solid var(--color--foreground);
	}
}
</style>
