<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { ApiKey } from '@n8n/api-types';
import { DateTime } from 'luxon';

import { N8nActionToggle, N8nCard, N8nText } from '@n8n/design-system';
const API_KEY_ITEM_ACTIONS = {
	EDIT: 'edit',
	DELETE: 'delete',
};

const ACTION_LIST = [
	{
		label: 'Edit',
		value: API_KEY_ITEM_ACTIONS.EDIT,
	},
	{
		label: 'Delete',
		value: API_KEY_ITEM_ACTIONS.DELETE,
	},
];

const i18n = useI18n();
const cardActions = ref<HTMLDivElement | null>(null);

const props = defineProps<{
	apiKey: ApiKey;
}>();

const emit = defineEmits<{
	edit: [id: string];
	delete: [id: string];
}>();

async function onAction(action: string) {
	if (action === API_KEY_ITEM_ACTIONS.EDIT) {
		emit('edit', props.apiKey.id);
	} else if (action === API_KEY_ITEM_ACTIONS.DELETE) {
		emit('delete', props.apiKey.id);
	}
}

const hasApiKeyExpired = (apiKey: ApiKey) => {
	if (!apiKey.expiresAt) return false;
	return apiKey.expiresAt <= Date.now() / 1000;
};

const getExpirationTime = (apiKey: ApiKey): string => {
	if (!apiKey.expiresAt) return i18n.baseText('settings.api.neverExpires');

	if (hasApiKeyExpired(apiKey)) return i18n.baseText('settings.api.expired');

	const time = DateTime.fromSeconds(apiKey.expiresAt).toFormat('ccc, MMM d yyyy');

	return i18n.baseText('settings.api.expirationTime', { interpolate: { time } });
};
</script>

<template>
	<N8nCard :class="$style.cardLink" data-test-id="api-key-card" @click="onAction('edit')">
		<template #header>
			<div>
				<N8nText tag="h2" bold :class="$style.cardHeading">
					{{ apiKey.label }}
				</N8nText>
				<div :class="[$style.cardDescription]">
					<N8nText :color="!hasApiKeyExpired(apiKey) ? 'text-light' : 'warning'" size="small">
						<span>{{ getExpirationTime(apiKey) }}</span>
					</N8nText>
				</div>
			</div>
			<div v-if="apiKey.apiKey.includes('*')" :class="$style.cardApiKey">
				<N8nText color="text-light" size="small"> {{ apiKey.apiKey }}</N8nText>
			</div>
		</template>

		<template #append>
			<div ref="cardActions" :class="$style.cardActions">
				<N8nActionToggle :actions="ACTION_LIST" theme="dark" @action="onAction" />
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0 0 0 var(--spacing--sm);
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
	font-size: var(--font-size--sm);
	word-break: word-break;
	padding: var(--spacing--sm) 0 0 var(--spacing--sm);
	width: 200px;
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	padding: 0 var(--spacing--sm) 0 0;
	cursor: default;
}

.cardApiKey {
	flex-grow: 1;
	display: flex;
	justify-content: center;
}
</style>
