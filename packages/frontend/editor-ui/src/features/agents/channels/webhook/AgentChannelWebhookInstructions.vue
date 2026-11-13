<script setup lang="ts">
import type { AgentWebhookAuthentication } from '@n8n/api-types';
import { N8nCodeBlock, N8nCollapsiblePanel, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

const props = defineProps<{ authentication: AgentWebhookAuthentication }>();

const i18n = useI18n();
const open = ref(false);

// Points to the agents docs until a page for the webhook channel exists.
const DOCS_URL = 'https://docs.n8n.io/build/build-and-manage-agents';

// Bodies of the webhook API. They are code, so they are not translated.
const examples = {
	message: JSON.stringify({ input: 'Hello' }, null, 2),
	conversation: JSON.stringify(
		{ input: 'And tomorrow?', conversation: '<conversation.id>' },
		null,
		2,
	),
	// The part of a response that asks for a decision. The message item is left out.
	approvalRequest: JSON.stringify(
		{
			output: [
				{
					type: 'approval_request',
					name: 'send_email',
					arguments: JSON.stringify({ to: 'ana@example.com' }),
					supports_session_approval: true,
					url: '<approval URL>',
				},
			],
		},
		null,
		2,
	),
	decision: JSON.stringify({ approved: true }, null, 2),
};

const authenticationHint = computed(() => {
	if (props.authentication === 'headerAuth') {
		return i18n.baseText('agents.channels.webhook.instructions.auth.headerAuth');
	}
	if (props.authentication === 'jwtAuth') {
		return i18n.baseText('agents.channels.webhook.instructions.auth.jwtAuth');
	}
	return '';
});
</script>

<template>
	<N8nCollapsiblePanel
		v-model="open"
		:class="$style.panel"
		:title="i18n.baseText('agents.channels.webhook.instructions.title')"
		:show-actions-on-hover="false"
		data-testid="webhook-instructions"
	>
		<div :class="$style.content">
			<section :class="$style.section">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.webhook.instructions.message.title') }}
				</N8nText>
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.webhook.instructions.message.description') }}
				</N8nText>
				<N8nText
					v-if="authenticationHint"
					:class="$style.hint"
					size="small"
					data-testid="webhook-instructions-auth"
				>
					{{ authenticationHint }}
				</N8nText>
				<N8nCodeBlock :code="examples.message" language="json" />
			</section>

			<section :class="$style.section">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.webhook.instructions.conversation.title') }}
				</N8nText>
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.webhook.instructions.conversation.description') }}
				</N8nText>
				<N8nCodeBlock :code="examples.conversation" language="json" />
			</section>

			<section :class="$style.section">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.webhook.instructions.approval.title') }}
				</N8nText>
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.webhook.instructions.approval.description') }}
				</N8nText>
				<N8nCodeBlock :code="examples.approvalRequest" language="json" />
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.webhook.instructions.approval.decision') }}
				</N8nText>
				<N8nCodeBlock :code="examples.decision" language="json" />
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.webhook.instructions.approval.session') }}
				</N8nText>
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.webhook.instructions.approval.pending') }}
				</N8nText>
			</section>

			<N8nLink
				:to="DOCS_URL"
				new-window
				size="small"
				:class="$style.learnMore"
				data-testid="webhook-instructions-learn-more"
			>
				{{ i18n.baseText('agents.channels.webhook.instructions.docs') }}
			</N8nLink>
		</div>
	</N8nCollapsiblePanel>
</template>

<style module lang="scss">
.panel {
	background-color: transparent;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.hint {
	color: var(--text-color--subtler);
}

.learnMore {
	align-self: flex-start;
}
</style>
