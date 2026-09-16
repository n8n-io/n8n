<script setup lang="ts">
import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';
import { N8nAssistantAvatar, N8nAvatar, N8nIcon } from '@n8n/design-system';

import { isSelfHealingAssistant } from '@/features/self-healing/selfHealing.constants';

/**
 * The avatar column of a feed entry that names a person: the actor's avatar, or a person
 * silhouette when the actor was deleted. The self-healing assistant gets its own avatar.
 */
defineProps<{
	actor:
		| (Pick<WorkflowReviewEligibleReviewer, 'firstName' | 'lastName'> &
				Partial<Pick<WorkflowReviewEligibleReviewer, 'id'>>)
		| null;
}>();
</script>

<template>
	<N8nAssistantAvatar
		v-if="isSelfHealingAssistant(actor)"
		size="mini"
		:class="[$style.avatar, $style.assistantAvatar]"
		data-test-id="workflow-review-activity-assistant-avatar"
	/>
	<N8nAvatar
		v-else-if="actor"
		size="xxsmall"
		:class="$style.avatar"
		:first-name="actor.firstName"
		:last-name="actor.lastName"
	/>
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
@use '../activity-card' as *;

.avatar {
	@include activity-avatar;
}

/* Sized like the person avatar so both keep the same column. */
.assistantAvatar {
	width: var(--review-activity--avatar-size);
	height: var(--review-activity--avatar-size);
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
