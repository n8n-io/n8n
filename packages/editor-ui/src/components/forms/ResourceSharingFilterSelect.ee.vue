<template>
	<n8n-select
		:value="value"
		@input="$emit('input', $event)"
		class="ph-no-capture"
		:class="$style.userSelect"
		size="small"
		filterable
	>
		<template
			v-for="user in allUsers"
		>
			<n8n-option
				v-if="!user.isPending"
				:key="user.id"
				:value="user.id"
				:label="user.fullName"
				:disabled="user.id === relatedId"
			>
				<n8n-user-info
					v-bind="user"
					:class="$style.userInfo"
					:isCurrentUser="user.id === currentUser.id"
					:disabled="user.id === relatedId"
				/>
			</n8n-option>
		</template>
	</n8n-select>
</template>

<script lang="ts">
import Vue from 'vue';
import {IUser} from "@/Interface";

export default Vue.extend({
	props: {
		value: {
			type: String,
			default: '',
		},
		relatedId: {
			type: String,
			default: '',
		},
	},
	computed: {
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
		},
		allUsers(): IUser[] {
			return this.$store.getters['users/allUsers'];
		},
	},
});
</script>

<style lang="scss" module>
.userSelect {
	--select-option-line-height: auto;
}

.userInfo {
	margin: var(--spacing-2xs) 0;
}
</style>
