<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { ApiKeyOwner } from '@n8n/api-types';
import { N8nAvatar, N8nText } from '@n8n/design-system';

const props = defineProps<{
	owner: ApiKeyOwner;
	isCurrentUser?: boolean;
}>();

const i18n = useI18n();

const displayName = computed(() => {
	const name = [props.owner.firstName, props.owner.lastName].filter(Boolean).join(' ').trim();
	return name || props.owner.email || '';
});
</script>

<template>
	<div :class="$style.cell" data-test-id="api-key-owner-cell">
		<N8nAvatar
			:first-name="owner.firstName ?? ''"
			:last-name="owner.lastName ?? ''"
			size="xsmall"
			:class="$style.avatar"
		/>
		<div :class="$style.info">
			<N8nText size="small" color="text-dark" :class="$style.name">
				{{ displayName }}
				<span v-if="isCurrentUser" :class="$style.you">{{
					i18n.baseText('settings.api.owners.you')
				}}</span>
			</N8nText>
			<N8nText size="xsmall" color="text-light" :class="$style.email" data-test-id="user-email">
				{{ owner.email }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.cell {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.avatar {
	flex-shrink: 0;
}

.info {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.name,
.email {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.you {
	color: var(--color--text--tint-2);
}
</style>
