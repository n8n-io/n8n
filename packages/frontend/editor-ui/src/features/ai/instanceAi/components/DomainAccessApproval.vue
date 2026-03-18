<script lang="ts" setup>
import { ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{
	requestId: string;
	url: string;
	host: string;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const resolved = ref(false);

function handleAction(approved: boolean, domainAccessAction?: string) {
	resolved.value = true;
	void store.confirmAction(
		props.requestId,
		approved,
		undefined,
		undefined,
		undefined,
		undefined,
		domainAccessAction,
	);
}
</script>

<template>
	<div v-if="!resolved" :class="$style.root">
		<div :class="$style.message">
			<N8nIcon icon="globe" :class="$style.icon" size="small" />
			<span>{{
				i18n.baseText('instanceAi.domainAccess.prompt', { interpolate: { domain: props.host } })
			}}</span>
		</div>
		<div :class="$style.urlPreview">{{ props.url }}</div>
		<div :class="$style.actions">
			<button
				:class="[$style.btn, $style.denyBtn]"
				data-test-id="domain-access-deny"
				@click="handleAction(false)"
			>
				{{ i18n.baseText('instanceAi.domainAccess.deny') }}
			</button>
			<button
				:class="[$style.btn, $style.secondaryBtn]"
				data-test-id="domain-access-allow-once"
				@click="handleAction(true, 'allow_once')"
			>
				{{ i18n.baseText('instanceAi.domainAccess.allowOnce') }}
			</button>
			<button
				:class="[$style.btn, $style.secondaryBtn]"
				data-test-id="domain-access-allow-all"
				@click="handleAction(true, 'allow_all')"
			>
				{{ i18n.baseText('instanceAi.domainAccess.allowAll') }}
			</button>
			<button
				:class="[$style.btn, $style.primaryBtn]"
				data-test-id="domain-access-allow-domain"
				@click="handleAction(true, 'allow_domain')"
			>
				{{
					i18n.baseText('instanceAi.domainAccess.allowDomain', {
						interpolate: { domain: props.host },
					})
				}}
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	border-top: var(--border);
	padding: var(--spacing--xs);
	background: var(--color--background--shade-1);
}

.message {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-bottom: var(--spacing--2xs);
}

.icon {
	color: var(--color--primary);
	flex-shrink: 0;
	margin-top: 1px;
}

.urlPreview {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	word-break: break-all;
	margin-bottom: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: var(--color--background);
	border-radius: var(--radius);
	border: var(--border);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	flex-wrap: wrap;
}

.btn {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.denyBtn {
	color: var(--color--text--tint-1);
}

.secondaryBtn {
	color: var(--color--text);
}

.primaryBtn {
	background: var(--color--primary);
	color: var(--button--color--text--primary);
	border-color: var(--color--primary);

	&:hover {
		background: var(--color--primary--shade-1);
	}
}
</style>
