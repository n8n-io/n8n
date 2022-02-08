<template>
	<div :class="$style.container">
		<div :class="$style.avatarContainer">
			<n8n-avatar :name="fullName" />
		</div>

		<div v-if="isPendingUser" :class="$style.pendingUser">
			<n8n-text :bold="true">{{email}}</n8n-text>
			<span :class="$style.pendingBadge"><n8n-badge :bold="true">Pending</n8n-badge></span>
		</div>
		<div v-else :class="$style.infoContainer">
			<div>
				<n8n-text :bold="true">{{fullName}} {{isCurrentUser ? '(you)' : ''}}</n8n-text>
			</div>
			<div>
				<n8n-text size="small" color="text-light">{{email}}</n8n-text>
			</div>
		</div>
	</div>
</template>


<script lang="ts">
import Vue from 'vue';
import N8nText from '../N8nText';
import N8nAvatar from '../N8nAvatar';
import N8nBadge from '../N8nBadge';

export default Vue.extend({
	name: 'n8n-users-info',
	components: {
		N8nAvatar,
		N8nText,
		N8nBadge,
	},
	props: {
		fullName: {
			type: String,
		},
		email: {
			type: String,
		},
		isPendingUser: {
			type: Boolean,
		},
		isCurrentUser: {
			type: Boolean,
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
