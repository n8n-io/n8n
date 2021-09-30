<template>
	<div :class="$style.container">
		<div :class="$style.avatarContainer">
			<n8n-avatar v-if="user.firstName" :firstName="user.firstName" :lastName="user.lastName" />
			<div v-else>
				<n8n-icon icon="user-clock" size="large" />
			</div>
		</div>
		<div v-if="user.firstName" :class="$style.infoContainer">
			<div>
				<n8n-text :bold="true">{{user.firstName}} {{user.lastName}} {{currentUserId === user.id ? '(you)' : ''}}</n8n-text>
			</div>
			<div>
				<n8n-text color="light">{{user.email}}</n8n-text>
			</div>
		</div>
		<div v-else :class="$style.infoContainer">
			<n8n-text :bold="true">{{user.email}}</n8n-text>
		</div>
	</div>
</template>


<script lang="ts">
import Vue from 'vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nAvatar from '../N8nAvatar';

export interface IUser {
	id: string;
	firstName?: string;
	lastName?: string;
	email: string;
	isOwner: boolean;
}

export default Vue.extend({
	name: 'n8n-users-info',
	components: {
		N8nAvatar,
		N8nIcon,
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
	display: flex;
}

.avatarContainer {
	min-height: 40px;
	min-width: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-light);
}

.infoContainer {
	flex-grow: 1;
	display: flex;
	flex-direction: column;;
	justify-content: center;
	margin-left: var(--spacing-xs);
}
</style>
