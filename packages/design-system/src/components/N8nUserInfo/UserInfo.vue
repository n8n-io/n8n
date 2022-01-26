<template>
	<div :class="$style.container">
		<div :class="$style.avatarContainer">
			<n8n-avatar v-if="user.firstName" :firstName="user.firstName" :lastName="user.lastName" />
			<div v-else>
				<n8n-icon icon="user-clock" size="xlarge" />
			</div>
		</div>
		<div v-if="user.firstName" :class="$style.infoContainer">
			<div>
				<n8n-text :bold="true">{{user.firstName}} {{user.lastName}} {{currentUserId === user.id ? '(you)' : ''}}</n8n-text>
			</div>
			<div>
				<n8n-text size="small" color="light">{{user.email}}</n8n-text>
			</div>
		</div>
		<div v-else :class="$style.pendingUser">
			<n8n-text :bold="true">{{user.email}}</n8n-text>
			<span :class="$style.pendingBadge"><n8n-badge>Pending</n8n-badge></span>
		</div>
	</div>
</template>


<script lang="ts">
import Vue from 'vue';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import N8nAvatar from '../N8nAvatar';
import N8nBadge from '../N8nBadge';

export default Vue.extend({
	name: 'n8n-users-info',
	components: {
		N8nAvatar,
		N8nIcon,
		N8nText,
		N8nBadge,
	},
	props: {
		user: {
			type: Object,
			required: true,
		},
		currentUserId: {
			type: String || null,
		},
	},
});
</script>


<style lang="scss" module>
.container {
	display: inline-flex;
	overflow: hidden;
}

.avatarContainer {
	min-height: 40px;
	min-width: 40px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-light);
}

.infoContainer {
	flex-grow: 1;
	display: inline-flex;
	flex-direction: column;;
	justify-content: center;
	margin-left: var(--spacing-xs);
}

.pendingUser {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-left: var(--spacing-xs);
}

.pendingBadge {
	margin-left: var(--spacing-3xs);
}
</style>
