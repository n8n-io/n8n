<script setup lang="ts">
import { ref } from 'vue';

import { N8nActionDropdown, N8nButton, N8nIconButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';

import type { WebFetchApproval } from '../../assistant.types';

type WebFetchAction = 'allow_once' | 'allow_domain' | 'allow_all' | 'deny';

interface Props {
	data: WebFetchApproval.MessageData;
	disabled?: boolean;
}

const props = defineProps<Props>();
const i18n = useI18n();

const emit = defineEmits<{
	decision: [
		payload: {
			requestId: string;
			url: string;
			domain: string;
			action: WebFetchAction;
		},
	];
}>();

const decided = ref(false);

const dropdownItems: Array<ActionDropdownItem<'allow_once' | 'allow_all'>> = [
	{
		id: 'allow_once',
		label: i18n.baseText('aiAssistant.builder.webFetch.allowOnce'),
	},
	{
		id: 'allow_all',
		label: i18n.baseText('aiAssistant.builder.webFetch.allowAll'),
	},
];

function onDecision(action: WebFetchAction) {
	decided.value = true;

	emit('decision', {
		requestId: props.data.requestId,
		url: props.data.url,
		domain: props.data.domain,
		action,
	});
}

function onDropdownSelect(action: 'allow_once' | 'allow_all') {
	onDecision(action);
}
</script>

<template>
	<div v-if="!decided" :class="$style.container">
		<N8nText :class="$style.prompt" size="small">
			{{ i18n.baseText('aiAssistant.builder.webFetch.prompt') }}
		</N8nText>
		<div :class="$style.urlBox">
			<N8nText :class="$style.urlText" tag="code" size="small">
				{{ data.url }}
			</N8nText>
		</div>
		<div :class="$style.actions">
			<div :class="$style.splitButton">
				<N8nButton
					variant="solid"
					:class="$style.splitButtonMain"
					:label="i18n.baseText('aiAssistant.builder.webFetch.alwaysAllow')"
					:aria-label="i18n.baseText('aiAssistant.builder.webFetch.alwaysAllow')"
					:disabled="disabled"
					data-test-id="approve-web-fetch-button"
					@click="onDecision('allow_domain')"
				/>
				<N8nActionDropdown
					:items="dropdownItems"
					:class="$style.splitButtonDropdown"
					:disabled="disabled"
					placement="bottom-end"
					data-test-id="web-fetch-approval-dropdown"
					@select="onDropdownSelect"
				>
					<template #activator>
						<N8nIconButton
							variant="solid"
							icon="chevron-down"
							:class="$style.splitButtonCaret"
							:disabled="disabled"
							aria-label="More approval options"
						/>
					</template>
				</N8nActionDropdown>
			</div>
			<N8nButton
				variant="outline"
				:disabled="disabled"
				:label="i18n.baseText('aiAssistant.builder.webFetch.deny')"
				@click="onDecision('deny')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--spacing--3xs);
	background-color: white;
	overflow: clip;
}

.prompt {
	font-weight: 500;
	color: var(--color--text);
}

.urlBox {
	background-color: var(--color--neutral-125);
	border-radius: var(--spacing--4xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	overflow: hidden;
}

.urlText {
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	display: block;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.splitButton {
	display: flex;
	position: relative;
}

.splitButtonMain {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.splitButtonDropdown {
	display: flex;
}

.splitButtonCaret {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-left: 1px solid rgba(255, 255, 255, 0.4);
}
</style>
