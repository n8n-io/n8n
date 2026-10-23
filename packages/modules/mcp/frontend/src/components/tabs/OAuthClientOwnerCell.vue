<script lang="ts" setup>
import { computed } from 'vue';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import { N8nAvatar, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	owner: NonNullable<OAuthClientResponseDto['owner']>;
	isCurrentUser?: boolean;
}>();

const i18n = useI18n();

// Pending or nameless users fall back to their email, which is never empty.
const displayName = computed(() => {
	const name = [props.owner.firstName, props.owner.lastName].filter(Boolean).join(' ').trim();
	return name || props.owner.email;
});
</script>

<template>
	<div :class="$style.cell" data-test-id="mcp-client-owner-cell">
		<N8nAvatar
			:first-name="owner.firstName ?? ''"
			:last-name="owner.lastName ?? ''"
			size="xsmall"
			:class="$style.avatar"
		/>
		<div :class="$style.info">
			<N8nText size="small" color="text-dark" :class="$style.name">
				{{ displayName }}
				<!-- text-base: subtler than the name but the lightest DS text color
				     that still passes WCAG AA contrast on the row background. -->
				<N8nText v-if="isCurrentUser" size="small" color="text-base">
					{{ i18n.baseText('settings.mcp.oAuthClients.owner.you') }}
				</N8nText>
			</N8nText>
			<N8nText size="xsmall" color="text-light" :class="$style.email" data-test-id="user-email">
				{{ owner.email }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
/* Same compact owner treatment as the API keys table, so the two settings tables read alike. */
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
</style>
