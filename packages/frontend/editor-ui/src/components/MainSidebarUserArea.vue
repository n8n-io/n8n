<script setup lang="ts">
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users.store';
import {
	type IMenuItem,
	N8nAvatar,
	N8nIconButton,
	N8nMenuItem,
	N8nPopoverReka,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

defineProps<{ fullyExpanded: boolean; isCollapsed: boolean }>();

const i18n = useI18n();
const router = useRouter();
const usersStore = useUsersStore();

const userMenuItems = ref<IMenuItem[]>([
	{
		id: 'settings',
		icon: 'settings',
		label: i18n.baseText('settings'),
	},
	{
		id: 'logout',
		icon: 'door-open',
		label: i18n.baseText('auth.signout'),
	},
]);

const onLogout = () => {
	void router.push({ name: VIEWS.SIGNOUT });
};

const onUserActionToggle = (action: string) => {
	switch (action) {
		case 'logout':
			onLogout();
			break;
		case 'settings':
			void router.push({ name: VIEWS.SETTINGS });
			break;
		default:
			break;
	}
};
</script>

<template>
	<div ref="user" :class="$style.userArea">
		<N8nPopoverReka side="right" align="end" :side-offset="16">
			<template #content>
				<div :class="$style.popover">
					<N8nMenuItem
						v-for="action in userMenuItems"
						:key="action.id"
						:item="action"
						:data-test-id="`user-menu-item-${action.id}`"
						@click="() => onUserActionToggle(action.id)"
					/>
				</div>
			</template>
			<template #trigger>
				<div :class="$style.userAreaInner">
					<div class="ml-3xs" data-test-id="main-sidebar-user-menu">
						<!-- This dropdown is only enabled when sidebar is collapsed -->
						<div :class="{ ['clickable']: isCollapsed }">
							<N8nAvatar
								:first-name="usersStore.currentUser?.firstName"
								:last-name="usersStore.currentUser?.lastName"
								size="small"
							/>
						</div>
					</div>
					<div
						:class="{
							['ml-2xs']: true,
							[$style.userName]: true,
							[$style.expanded]: fullyExpanded,
						}"
					>
						<N8nText size="small" color="text-dark">
							{{ usersStore.currentUser?.fullName }}
						</N8nText>
					</div>
					<div
						data-test-id="user-menu"
						:class="{ [$style.userActions]: true, [$style.expanded]: fullyExpanded }"
					>
						<N8nIconButton icon="ellipsis" text square type="tertiary" />
					</div>
				</div>
			</template>
		</N8nPopoverReka>
	</div>
</template>

<style lang="scss" module>
.userArea {
	display: flex;
	padding: var(--spacing--xs);
	align-items: center;
	border-top: var(--border-width) var(--border-style) var(--color--foreground);

	.userName {
		flex-grow: 1;
		flex-shrink: 1;
		display: none;
		overflow: hidden;
		width: 100px;
		white-space: nowrap;
		text-overflow: ellipsis;

		&.expanded {
			display: initial;
		}

		span {
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	.userActions {
		display: none;

		&.expanded {
			display: initial;
		}
	}
}

.userAreaInner {
	display: flex;
	align-items: center;
	width: 100%;
}

.popover {
	padding: var(--spacing--xs);
	min-width: 200px;
}
</style>
