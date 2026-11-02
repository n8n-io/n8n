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
	/** Hide the avatar and show only the name and email. */
	hideAvatar?: boolean;
}

const props = withDefaults(defineProps<UsersInfoProps>(), {
	disabled: false,
	hideAvatar: false,
});

const { t } = useI18n();

const $style = useCssModule();
const classes = computed(
	(): Record<string, boolean> => ({
		[$style.container]: true,
		[$style.disabled]: props.disabled,
	}),
);

const fullName = computed(() =>
	[props.firstName, props.lastName, props.isCurrentUser ? t('nds.userInfo.you') : '']
		.filter(Boolean)
		.join(' '),
);
</script>

<template>
	<div :class="classes">
		<div v-if="!hideAvatar" :class="$style.avatarContainer" data-test-id="user-avatar">
			<N8nAvatar :first-name="firstName" :last-name="lastName" />
		</div>

		<div v-if="isPendingUser" :class="$style.pendingUser">
			<N8nText :class="$style.truncate" :title="email ?? undefined" :bold="true">{{
				email
			}}</N8nText>
			<N8nBadge>Pending</N8nBadge>
		</div>
		<div v-else :class="$style.infoContainer">
			<div :class="$style.nameLine">
				<N8nText :class="$style.truncate" :title="fullName" :bold="true" color="text-dark">
					{{ fullName }}
				</N8nText>
				<N8nBadge v-if="disabled">Disabled</N8nBadge>
			</div>
			<div :class="$style.truncate" :title="email ?? undefined">
				<N8nText data-test-id="user-email" size="small" color="text-light">{{ email }}</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: inline-flex;
	gap: var(--spacing--xs);
	max-width: 100%;
	overflow: hidden;
}

.avatarContainer {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-1);
}

.infoContainer {
	flex-grow: 1;
	min-width: 0;
	display: inline-flex;
	flex-direction: column;
	justify-content: center;
}

.pendingUser,
.nameLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.truncate {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.disabled {
	opacity: 0.5;
}
</style>
