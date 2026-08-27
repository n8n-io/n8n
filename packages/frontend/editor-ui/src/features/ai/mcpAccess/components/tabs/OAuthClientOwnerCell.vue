<script lang="ts" setup>
import type { OAuthClientResponseDto } from '@n8n/api-types';
import { N8nUserInfo } from '@n8n/design-system';

defineProps<{
	owner: NonNullable<OAuthClientResponseDto['owner']>;
	isCurrentUser?: boolean;
}>();
</script>

<template>
	<div data-test-id="mcp-client-owner-cell">
		<N8nUserInfo
			:first-name="owner.firstName ?? ''"
			:last-name="owner.lastName ?? ''"
			:email="owner.email"
			:is-current-user="isCurrentUser"
		/>
	</div>
</template>
