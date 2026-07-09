<script setup lang="ts">
/**
 * Agent Builder promo banner at the top of the AI Agent node's NDV Parameters
 * tab, shown only while no agent is referenced: its link creates a draft,
 * references it, and opens the builder for it (setting the "Back to workflow"
 * return context). Once an agent is referenced the banner disappears — the
 * Agent section header's "Edit in Agent Builder" link takes over navigation.
 */
import { computed, inject } from 'vue';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useAgentPermissions } from '@/features/agents/composables/useAgentPermissions';
import { useAgentCreate } from '@/features/agents/composables/useAgentCreate';

import { NdvAgentConfigKey } from '../composables/useNdvAgentConfig';

const props = defineProps<{
	isReadOnly?: boolean;
	/** Origin node for the builder's "Back to workflow" return context. */
	originNodeId?: string;
}>();

const emit = defineEmits<{
	setAgentReference: [value: INodeParameterResourceLocator];
}>();

const i18n = useI18n();
const ndv = inject(NdvAgentConfigKey);

const agentId = computed(() => ndv?.agentId.value ?? '');
const projectId = computed(() => ndv?.projectId.value ?? '');

const { canCreate } = useAgentPermissions(projectId);

const agentCreate = useAgentCreate({
	projectId,
	telemetrySource: 'ndv_banner',
	getOriginNodeId: () => props.originNodeId,
	setReference: (agent) =>
		emit('setAgentReference', {
			__rl: true,
			value: agent.id,
			mode: 'list',
			cachedResultName: agent.name,
		}),
});

// With an agent referenced the link is pure navigation; without one it first
// creates a draft agent, which needs create permission and an editable workflow.
const isLinkEnabled = computed(() => {
	// An in-flight create owns the flow even once its reference has landed —
	// re-enabling on agentId would open a second navigation path that skips
	// the workflow save createAndOpenBuilder is about to do.
	if (agentCreate.isCreating.value) return false;
	if (agentId.value) return true;
	return canCreate.value && !props.isReadOnly;
});

async function onLinkClick() {
	if (!isLinkEnabled.value) return;
	if (agentId.value) {
		await ndv?.openBuilder();
		return;
	}
	await agentCreate.createAndOpenBuilder();
}
</script>

<template>
	<div v-if="!agentId" :class="$style.banner" data-test-id="agent-ndv-builder-banner">
		<N8nIcon icon="sparkles" size="medium" :class="$style.icon" />
		<p :class="$style.text">
			{{ i18n.baseText('agentNode.ndv.banner.prefix') }}
			<button
				v-if="isLinkEnabled"
				type="button"
				:class="$style.link"
				data-test-id="agent-ndv-banner-open-builder"
				@click.prevent="onLinkClick"
			>
				{{ i18n.baseText('agentNode.ndv.banner.link') }}
			</button>
			<span v-else>
				{{ i18n.baseText('agentNode.ndv.banner.link') }}
			</span>
		</p>
	</div>
</template>

<style module>
.banner {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	width: 100%;
	margin-top: var(--spacing--sm);
	padding: var(--spacing--xs);
	border: var(--border-width, 1px) solid var(--color--purple-500);
	border-radius: var(--radius);
	background-color: var(--color--purple-50);
	color: var(--color--purple-800);
}

/* Dark mode: darker purple surface with light text (matches BackToWorkflowBanner) */
:global(body[data-theme='dark']) .banner {
	border-color: var(--color--purple-700);
	background-color: var(--color--purple-800);
	color: var(--color--neutral-white);
}

@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) .banner {
		border-color: var(--color--purple-700);
		background-color: var(--color--purple-800);
		color: var(--color--neutral-white);
	}
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--4xs);
}

.text {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xl);
	word-break: break-word;
}

.link {
	/* Reset button chrome so it reads as an inline link. */
	padding: 0;
	border: none;
	background: none;
	font: inherit;
	color: inherit;
	text-decoration: underline;
	text-underline-position: from-font;
	cursor: pointer;
}
</style>
