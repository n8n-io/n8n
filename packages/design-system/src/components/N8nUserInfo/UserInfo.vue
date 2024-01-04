<template>
	<div :class="classes">
		<div :class="$style.avatarContainer">
			<N8nAvatar :first-name="firstName" :last-name="lastName" />
		</div>

		<div v-if="isPendingUser" :class="$style.pendingUser">
			<N8nText :bold="true">{{ email }}</N8nText>
			<span :class="$style.pendingBadge"><N8nBadge :bold="true">Pending</N8nBadge></span>
		</div>
		<div v-else :class="$style.infoContainer">
			<div>
				<N8nText :bold="true" color="text-dark">
					{{ firstName }} {{ lastName }}
					{{ isCurrentUser ? t('nds.userInfo.you') : '' }}
				</N8nText>
				<span v-if="disabled" :class="$style.pendingBadge">
					<N8nBadge :bold="true">Disabled</N8nBadge>
				</span>
			</div>
			<div>
				<N8nText data-test-id="user-email" size="small" color="text-light">{{ email }}</N8nText>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import N8nText from '../N8nText';
import N8nAvatar from '../N8nAvatar';
import N8nBadge from '../N8nBadge';
import Locale from '../../mixins/locale';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nUsersInfo',
	components: {
		N8nAvatar,
		N8nText,
		N8nBadge,
	},
	mixins: [Locale],
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
		settings: {
			type: Object,
			required: false,
		},
		isSamlLoginEnabled: {
			type: Boolean,
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
