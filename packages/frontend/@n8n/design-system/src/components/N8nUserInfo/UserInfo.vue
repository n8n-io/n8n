<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nAvatar from '../N8nAvatar';
import N8nBadge from '../N8nBadge';
import N8nText from '../N8nText';

interface UsersInfoProps {
	firstName?: string;
	lastName?: string;
	email?: string;
	isOwner?: boolean;
	isPendingUser?: boolean;
	isCurrentUser?: boolean;
	disabled?: boolean;
	settings?: object;
	isSamlLoginEnabled?: boolean;
	tokensConsumed: number;
	costIncurred: number;
}

const props = withDefaults(defineProps<UsersInfoProps>(), {
	disabled: false,
});

const formattedTokensConsumed = computed(() => {
	const tokens = props?.tokensConsumed ?? 0;
	if (tokens < 1000) {
		return tokens;
	}
	if (tokens < 1000000) {
		return `${(tokens / 1000).toFixed(2)}k`;
	}
	return `${(tokens / 1000000).toFixed(2)}M`;
});

const formattedCostsIncurred = computed(() => {
	const cost = props?.costIncurred ?? 0;
	if (cost < 1) {
		return `${(cost * 100).toFixed(5)} cents`;
	}
	if (cost < 1000) {
		return cost;
	}
	if (cost < 1000000) {
		return `${(cost / 1000).toFixed(2)}k`;
	}
	return `${(cost / 1000000).toFixed(2)}M`;
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
			<span :class="$style.pendingBadge"
				><N8nBadge :bold="true">{{ t('settings.users.pending') }}</N8nBadge></span
			>
		</div>
		<div v-else :class="$style.infoContainer">
			<div>
				<N8nText :bold="true" color="text-dark">
					{{ firstName }} {{ lastName }}
					{{ isCurrentUser ? t('nds.userInfo.you') : '' }}
				</N8nText>
				<span v-if="disabled" :class="$style.pendingBadge">
					<N8nBadge :bold="true">{{ t('settings.users.disabled') }}</N8nBadge>
				</span>
			</div>
			<div>
				<N8nText data-test-id="user-email" size="small" color="text-light">{{ email }}</N8nText>
			</div>
			<div>
				<N8nText data-test-id="user-email" size="small" color="text-light">
					{{ t('settings.users.tokensConsumed') }}: {{ formattedTokensConsumed }} |
					{{ t('settings.users.costIncurred') }}: {{ formattedCostsIncurred }}
				</N8nText>
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
