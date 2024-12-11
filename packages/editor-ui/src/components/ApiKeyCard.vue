<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { ApiKey } from '@/Interface';
import { DateTime } from 'luxon';

const API_KEY_ITEM_ACTIONS = {
	EDIT: 'edit',
	DELETE: 'delete',
};

const i18n = useI18n();
const cardActions = ref<HTMLDivElement | null>(null);

const props = defineProps<{
	apiKey: ApiKey;
}>();

const emit = defineEmits<{
	edit: [id: string];
	delete: [id: string];
}>();

const actions = computed((): Array<{ label: string; value: string }> => {
	const actionList = [
		{
			label: 'Edit',
			value: API_KEY_ITEM_ACTIONS.EDIT,
		},
	];
	actionList.push({
		label: 'Delete',
		value: API_KEY_ITEM_ACTIONS.DELETE,
	});

	return actionList;
});

async function onAction(action: string) {
	if (action === API_KEY_ITEM_ACTIONS.EDIT) {
		emit('edit', props.apiKey.id);
	} else if (action === API_KEY_ITEM_ACTIONS.DELETE) {
		emit('delete', props.apiKey.id);
	}
}

const getApiCreationTime = (apiKey: ApiKey): string => {
	const timeAgo = DateTime.fromMillis(Date.parse(apiKey.createdAt)).toRelative() ?? '';
	return i18n.baseText('settings.api.creationTime', { interpolate: { time: timeAgo } });
};
</script>

<template>
	<n8n-card :class="$style.cardLink" data-test-id="api-key-card" @click="onAction('edit')">
		<template #header>
			<div>
				<n8n-heading tag="h2" bold :class="$style.cardHeading">
					{{ apiKey.label }}
				</n8n-heading>
				<div :class="$style.cardDescription">
					<n8n-text color="text-light" size="small">
						<span>{{ getApiCreationTime(apiKey) }}</span>
					</n8n-text>
				</div>
			</div>
		</template>
		<template #append>
			<div ref="cardActions" :class="$style.cardActions">
				<n8n-action-toggle :actions="actions" theme="dark" @action="onAction" />
			</div>
		</template>
	</n8n-card>
</template>

<style lang="scss" module>
.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0 0 0 var(--spacing-s);
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
	font-size: var(--font-size-s);
	word-break: break-word;
	padding: var(--spacing-s) 0 0 var(--spacing-s);
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing-s) var(--spacing-s);
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	padding: 0 var(--spacing-s) 0 0;
	cursor: default;
}
</style>
