<script setup lang="ts">
import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';
import { N8nAvatar, N8nIcon } from '@n8n/design-system';
import { computed } from 'vue';

import InboxAvatarTooltip from '../../../../../components/InboxAvatarTooltip.vue';
import { formatUserDisplayName } from '../../../../../reviews/workflowReviews.utils';

/**
 * The avatar column of a feed entry that names a person: the actor's avatar, or a person
 * silhouette when the actor was deleted.
 */
const props = defineProps<{
	actor: Pick<WorkflowReviewEligibleReviewer, 'firstName' | 'lastName'> | null;
}>();

const name = computed(() => (props.actor ? formatUserDisplayName(props.actor) : ''));
</script>

<template>
	<InboxAvatarTooltip v-if="actor" :name="name">
		<N8nAvatar
			size="xxsmall"
			:class="$style.avatar"
			:first-name="actor.firstName"
			:last-name="actor.lastName"
		/>
	</InboxAvatarTooltip>
	<!-- Decorative: the sentence beside it already says "Deleted user". -->
	<div
		v-else
		:class="$style.deletedActor"
		aria-hidden="true"
		data-test-id="workflow-review-activity-deleted-actor"
	>
		<N8nIcon icon="circle-user-round" :size="16" color="text-light" />
	</div>
</template>

<style lang="scss" module>
@use '../../../../../reviews/components/activity-card' as *;

.avatar {
	@include activity-avatar;
}

/* Sized and centred exactly like the avatar, so the two columns cannot drift apart. */
.deletedActor {
	@include activity-avatar;

	display: flex;
	width: var(--review-activity--avatar-size);
	height: var(--review-activity--avatar-size);
	align-items: center;
	justify-content: center;
}
</style>
