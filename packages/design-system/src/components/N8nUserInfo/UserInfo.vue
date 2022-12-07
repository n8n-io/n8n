<template>
	<div class="ph-no-capture" :class="classes">
		<div :class="$style.avatarContainer">
			<n8n-avatar :firstName="firstName" :lastName="lastName" />
		</div>

		<div v-if="isPendingUser" :class="$style.pendingUser">
			<n8n-text :bold="true">{{ email }}</n8n-text>
			<span :class="$style.pendingBadge"><n8n-badge :bold="true">Pending</n8n-badge></span>
		</div>
		<div v-else :class="$style.infoContainer">
			<div>
				<n8n-text :bold="true" color="text-dark">
					{{ firstName }} {{ lastName }}
					{{ isCurrentUser ? this.t('nds.userInfo.you') : '' }}
				</n8n-text>
				<span v-if="disabled" :class="$style.pendingBadge">
					<n8n-badge :bold="true">Disabled</n8n-badge>
				</span>
			</div>
			<div>
				<n8n-text size="small" color="text-light">{{ email }}</n8n-text>
			</div>
			<div v-if="!isOwner">
				<n8n-text v-if="signInType" size="small" color="text-light">
					Sign-in type: {{ signInType }}
				</n8n-text>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import 'vue';
import N8nText from '../N8nText';
import N8nAvatar from '../N8nAvatar';
import N8nBadge from '../N8nBadge';
import Locale from '../../mixins/locale';
import mixins from 'vue-typed-mixins';

export default mixins(Locale).extend({
	name: 'n8n-users-info',
	components: {
		N8nAvatar,
		N8nText,
		N8nBadge,
	},
	props: {
		firstName: {
			type: String,
		},
		lastName: {
			type: String,
		},
		email: {
			type: String,
		},
		isOwner: {
			type: Boolean,
		},
		isPendingUser: {
			type: Boolean,
		},
		isCurrentUser: {
			type: Boolean,
		},
		disabled: {
			type: Boolean,
		},
		signInType: {
			type: String,
			required: false,
		},
	},
	computed: {
		classes(): Record<string, boolean> {
			return {
				[this.$style.container]: true,
				[this.$style.disabled]: this.disabled,
			};
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
	flex-direction: column;
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
	margin-left: var(--spacing-xs);
}

.disabled {
	opacity: 0.5;
}
</style>
