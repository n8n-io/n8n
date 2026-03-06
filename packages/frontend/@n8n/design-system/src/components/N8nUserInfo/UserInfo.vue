<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nAvatar from '../N8nAvatar';
import N8nBadge from '../N8nBadge';
import N8nText from '../N8nText';

export interface UsersInfoProps {
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	isOwner?: boolean;
	isPendingUser?: boolean;
	isCurrentUser?: boolean;
	disabled?: boolean;
	settings?: object;
	isSamlLoginEnabled?: boolean;
	mfaEnabled?: boolean;
}

const props = withDefaults(defineProps<UsersInfoProps>(), {
	disabled: false,
});

const { t } = useI18n();

const $style = useCssModule();
const classes = computed(
	(): Record<string, boolean> => ({
		[$style.container]: true,
		[$style.disabled]: props.disabled,
	}),
);
</script>

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

<style lang="scss" module>
.container {
	display: inline-flex;
	overflow: hidden;
}

.avatarContainer {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-1);
}

.infoContainer {
	flex-grow: 1;
	display: inline-flex;
	flex-direction: column;
	justify-content: center;
	margin-left: var(--spacing--xs);
}

.pendingUser {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-left: var(--spacing--xs);
}

.pendingBadge {
	margin-left: var(--spacing--xs);
}

.disabled {
	opacity: 0.5;
}
</style>
