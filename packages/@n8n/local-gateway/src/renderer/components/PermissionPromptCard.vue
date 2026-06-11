<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import AssistantButton from './AssistantButton.vue';

import type { PermissionPrompt, PromptResponse } from '../permissions/prompt-classification';

/**
 * One permission prompt, styled after the composer's done-card: an accent
 * header strip (colored by severity), the request text, and per-kind action
 * buttons. Purely presentational — the host routes `respond` to the store.
 */
const props = defineProps<{
	prompt: PermissionPrompt;
	/** A response is in flight — buttons are disabled. */
	responding?: boolean;
	/** The last response failed retryably — an error line is shown. */
	failed?: boolean;
}>();

const emit = defineEmits<{ respond: [response: PromptResponse] }>();

const i18n = useI18n();

const destructive = computed(() => props.prompt.severity === 'destructive');

const headerIcon = computed(() => {
	switch (props.prompt.kind) {
		case 'resourceDecision':
			return 'shield-half';
		case 'domainAccess':
			return 'globe';
		case 'external':
			return 'external-link';
		default:
			return 'message-circle';
	}
});

const headerTitle = computed(() => {
	switch (props.prompt.kind) {
		case 'resourceDecision':
		case 'domainAccess':
			return i18n.baseText('desktopAssistant.permissions.titlePermission');
		case 'external':
			return i18n.baseText('desktopAssistant.permissions.titleExternal');
		default:
			return i18n.baseText('desktopAssistant.permissions.titleApproval');
	}
});

/** The technical subject of the request, shown as a code line (path, command, URL, query). */
const detail = computed(() => {
	if (props.prompt.kind === 'resourceDecision') return props.prompt.resourceDecision?.resource;
	if (props.prompt.kind === 'domainAccess') {
		return props.prompt.domainAccess?.url ?? props.prompt.webSearch?.query;
	}
	return undefined;
});

const resourceOptions = computed(() =>
	props.prompt.kind === 'resourceDecision' ? (props.prompt.resourceDecision?.options ?? []) : [],
);

/** Persistent grants are not offered for destructive actions. */
const showAllowForSession = computed(
	() => resourceOptions.value.includes('allowForSession') && !destructive.value,
);

const allowDomainLabel = computed(() =>
	props.prompt.kind === 'domainAccess' && props.prompt.domainAccess
		? i18n.baseText('desktopAssistant.permissions.allowDomain', {
				interpolate: { domain: props.prompt.domainAccess.host },
			})
		: i18n.baseText('desktopAssistant.permissions.allowWebSearch'),
);

function deny() {
	switch (props.prompt.kind) {
		case 'resourceDecision':
			emit('respond', { kind: 'resourceDecision', decision: 'denyOnce' });
			break;
		case 'domainAccess':
			emit('respond', { kind: 'domainAccessDeny' });
			break;
		default:
			emit('respond', { kind: 'approval', approved: false });
	}
}
</script>

<template>
	<div :class="[$style.card, $style[prompt.severity]]">
		<div :class="$style.header">
			<span :class="$style.badge">
				<N8nIcon :icon="headerIcon" :size="13" aria-hidden="true" />
			</span>
			<span :class="$style.title">{{ headerTitle }}</span>
		</div>

		<div :class="$style.body">
			<div :class="$style.message">{{ prompt.message }}</div>
			<div v-if="detail && detail !== prompt.message" :class="$style.detail">{{ detail }}</div>

			<div v-if="failed" :class="$style.error" role="alert">
				{{ i18n.baseText('desktopAssistant.permissions.submitFailed') }}
			</div>

			<div v-if="prompt.kind === 'external'" :class="$style.externalHint">
				{{ i18n.baseText('desktopAssistant.permissions.externalHint') }}
			</div>

			<div v-else :class="$style.actions">
				<AssistantButton :disabled="responding" @click="deny">
					{{ i18n.baseText('desktopAssistant.permissions.deny') }}
				</AssistantButton>

				<template v-if="prompt.kind === 'approval'">
					<AssistantButton
						variant="solid"
						:danger="destructive"
						:disabled="responding"
						@click="emit('respond', { kind: 'approval', approved: true })"
					>
						{{ i18n.baseText('desktopAssistant.permissions.approve') }}
					</AssistantButton>
				</template>

				<template v-else-if="prompt.kind === 'continue'">
					<AssistantButton
						variant="solid"
						:disabled="responding"
						@click="emit('respond', { kind: 'continue' })"
					>
						{{ i18n.baseText('desktopAssistant.permissions.continue') }}
					</AssistantButton>
				</template>

				<template v-else-if="prompt.kind === 'resourceDecision'">
					<AssistantButton
						v-if="showAllowForSession"
						:disabled="responding"
						@click="emit('respond', { kind: 'resourceDecision', decision: 'allowForSession' })"
					>
						{{ i18n.baseText('desktopAssistant.permissions.allowForSession') }}
					</AssistantButton>
					<AssistantButton
						v-if="resourceOptions.includes('allowOnce')"
						variant="solid"
						:danger="destructive"
						:disabled="responding"
						@click="emit('respond', { kind: 'resourceDecision', decision: 'allowOnce' })"
					>
						{{ i18n.baseText('desktopAssistant.permissions.allowOnce') }}
					</AssistantButton>
				</template>

				<template v-else-if="prompt.kind === 'domainAccess'">
					<AssistantButton
						v-if="!destructive"
						:disabled="responding"
						@click="emit('respond', { kind: 'domainAccessApprove', action: 'allow_domain' })"
					>
						{{ allowDomainLabel }}
					</AssistantButton>
					<AssistantButton
						variant="solid"
						:danger="destructive"
						:disabled="responding"
						@click="emit('respond', { kind: 'domainAccessApprove', action: 'allow_once' })"
					>
						{{ i18n.baseText('desktopAssistant.permissions.allowOnce') }}
					</AssistantButton>
				</template>
			</div>
		</div>
	</div>
</template>

<style module>
.card {
	/* Severity accent, referenced by the header strip, badge, and border. */
	--prompt-accent: var(--da-blue);

	overflow: hidden;
	background: var(--da-surface-2);
	border: 1px solid color-mix(in srgb, var(--prompt-accent) 45%, transparent);
	border-radius: var(--da-radius);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.warning {
	--prompt-accent: var(--da-amber);
}

.destructive {
	--prompt-accent: var(--da-red);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 10px var(--spacing--xs);
	background: color-mix(in srgb, var(--prompt-accent) 12%, transparent);
	border-bottom: 1px solid color-mix(in srgb, var(--prompt-accent) 22%, transparent);
}

.badge {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	color: var(--prompt-accent);
	background: color-mix(in srgb, var(--prompt-accent) 20%, transparent);
	border-radius: 50%;
}

.title {
	overflow: hidden;
	font-size: 13px;
	font-weight: 600;
	color: var(--prompt-accent);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	padding: var(--spacing--xs);
}

.message {
	font-size: 12px;
	color: var(--da-text);
	overflow-wrap: anywhere;
}

.detail {
	margin-top: var(--spacing--3xs);
	font-family: var(--font-family--monospace, monospace);
	font-size: 11px;
	color: var(--da-subtler);
	overflow-wrap: anywhere;
}

.error {
	margin-top: var(--spacing--3xs);
	font-size: 12px;
	color: var(--da-red);
}

.externalHint {
	margin-top: var(--spacing--xs);
	font-size: 12px;
	color: var(--da-subtler);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	margin-top: var(--spacing--xs);
}
</style>
