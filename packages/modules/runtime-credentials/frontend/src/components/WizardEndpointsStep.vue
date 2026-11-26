<script setup lang="ts">
import { N8nCallout, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import RuleImpact from './RuleImpact.vue';
import { findInvalidAllowedDomain, parseAllowedDomains } from '../runtime-credentials.utils';

const {
	nodeType,
	path,
	baseline = undefined,
} = defineProps<{
	nodeType: string;
	path: string;
	baseline?: { nodeType: string; path: string };
}>();

const hosts = defineModel<string[]>('hosts', { required: true });
const draft = defineModel<string>('draft', { required: true });

const i18n = useI18n();

const invalidEntry = computed(() => findInvalidAllowedDomain(draft.value));

/** Moves the typed hosts into the list. A host that is not valid stays in the box. */
function commitDraft() {
	if (invalidEntry.value !== undefined) return;
	const added = parseAllowedDomains(draft.value).filter((host) => !hosts.value.includes(host));
	if (added.length > 0) hosts.value = [...hosts.value, ...added];
	draft.value = '';
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' || event.key === ',') {
		event.preventDefault();
		commitDraft();
	} else if (event.key === 'Backspace' && draft.value === '' && hosts.value.length > 0) {
		hosts.value = hosts.value.slice(0, -1);
	}
}

function remove(host: string) {
	hosts.value = hosts.value.filter((entry) => entry !== host);
}
</script>

<template>
	<div :class="$style.step" data-test-id="runtime-wizard-step-endpoints">
		<div :class="$style.field">
			<N8nText tag="label" size="small" bold for="runtime-rule-allowed-domains">
				{{ i18n.baseText('runtimeCredentials.wizard.endpoints.label') }}
			</N8nText>
			<ul v-if="hosts.length > 0" :class="$style.chips" data-test-id="runtime-endpoint-chips">
				<li
					v-for="host in hosts"
					:key="host"
					:class="$style.chip"
					data-test-id="runtime-endpoint-chip"
				>
					<N8nIcon icon="globe" size="xsmall" />
					<code>{{ host }}</code>
					<button
						type="button"
						:class="$style.remove"
						:aria-label="
							i18n.baseText('runtimeCredentials.wizard.endpoints.remove', {
								interpolate: { host },
							})
						"
						@click="remove(host)"
					>
						<N8nIcon icon="x" size="xsmall" />
					</button>
				</li>
			</ul>
			<N8nInput
				id="runtime-rule-allowed-domains"
				v-model="draft"
				:placeholder="i18n.baseText('runtimeCredentials.rules.modal.allowedDomains.placeholder')"
				data-test-id="runtime-rule-allowed-domains"
				@keydown="onKeydown"
				@blur="commitDraft"
			/>
			<N8nText
				v-if="invalidEntry !== undefined"
				size="small"
				color="danger"
				data-test-id="runtime-rule-allowed-domains-error"
			>
				{{
					i18n.baseText('runtimeCredentials.rules.modal.allowedDomains.invalid', {
						interpolate: { entry: invalidEntry },
					})
				}}
			</N8nText>
			<N8nText v-else size="small" color="text-light">
				{{
					hosts.length === 0 && draft.trim() === ''
						? i18n.baseText('runtimeCredentials.wizard.endpoints.any')
						: i18n.baseText('runtimeCredentials.wizard.endpoints.hint')
				}}
			</N8nText>
		</div>

		<N8nCallout theme="info" slim data-test-id="runtime-rule-allowed-domains-scope">
			{{ i18n.baseText('runtimeCredentials.rules.modal.allowedDomains.scope') }}
		</N8nCallout>

		<N8nCallout
			v-if="nodeType.trim() !== '' && path.trim() !== ''"
			theme="warning"
			slim
			data-test-id="runtime-rule-path-warning"
		>
			{{
				i18n.baseText('runtimeCredentials.rules.modal.pathWarning', {
					interpolate: { path: path.trim(), nodeType: nodeType.trim() },
				})
			}}
		</N8nCallout>
		<RuleImpact :node-type="nodeType" :path="path" :baseline="baseline" />
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-block-start: var(--spacing--xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.chip {
	display: inline-flex;
	width: fit-content;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--5xs) var(--spacing--3xs) var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--border-color--strong);
	border-radius: var(--radius--full);
	background-color: var(--background--surface);
	font-size: var(--font-size--2xs);

	code {
		font-family: var(--font-family--monospace);
	}
}

.remove {
	display: inline-flex;
	padding: var(--spacing--5xs);
	border: none;
	border-radius: var(--radius--full);
	background: none;
	color: var(--text-color--subtle);
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
		color: var(--text-color);
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
}
</style>
