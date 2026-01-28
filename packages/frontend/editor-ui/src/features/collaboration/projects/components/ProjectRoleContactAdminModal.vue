<script lang="ts" setup>
import { ref, computed } from 'vue';
import { ElDialog } from 'element-plus';
import { N8nAvatar, N8nButton, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ROLE } from '@n8n/api-types';
import { useUsersStore } from '@/features/settings/users/users.store';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants';

const visible = defineModel<boolean>();
const i18n = useI18n();
const usersStore = useUsersStore();

const currentView = ref<'main' | 'admins'>('main');

const instanceAdmins = computed(() =>
	usersStore.allUsers.filter((user) => user.role === ROLE.Owner || user.role === ROLE.Admin),
);

const onClose = () => {
	visible.value = false;
	// Reset to main view when modal closes
	setTimeout(() => {
		currentView.value = 'main';
	}, 300);
};

const showAdminsView = () => {
	currentView.value = 'admins';
};

const showMainView = () => {
	currentView.value = 'main';
};

const getUserDisplayName = (user: {
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
}) => {
	if (user.firstName && user.lastName) {
		return `${user.firstName} ${user.lastName}`;
	}
	if (user.firstName) {
		return user.firstName;
	}
	return user.email ?? '';
};
</script>

<template>
	<ElDialog v-model="visible" width="400" :show-close="true" @close="onClose">
		<template #header>
			<div :class="$style.header">
				<button
					v-if="currentView === 'admins'"
					type="button"
					:class="$style.backButton"
					@click="showMainView"
				>
					<N8nIcon icon="arrow-left" size="small" />
				</button>
				<N8nText tag="span" size="large" :bold="true">
					{{
						currentView === 'main'
							? i18n.baseText('projects.settings.role.contactAdmin.title')
							: i18n.baseText('projects.settings.role.contactAdmin.admins.title')
					}}
				</N8nText>
			</div>
		</template>

		<div :class="$style.content">
			<Transition :name="currentView === 'admins' ? 'slide-left' : 'slide-right'" mode="out-in">
				<!-- Main View -->
				<div v-if="currentView === 'main'" :key="'main'" :class="$style.mainView">
					<N8nText tag="p" size="medium">
						{{
							i18n
								.baseText('projects.settings.role.contactAdmin.body')
								.replace('{documentation}', '')
						}}
						<N8nLink :href="CUSTOM_ROLES_DOCS_URL" :new-window="true">
							{{ i18n.baseText('generic.documentation') }}
						</N8nLink>
						{{
							i18n.baseText('projects.settings.role.contactAdmin.body').includes('{documentation}')
								? ''
								: ''
						}}
					</N8nText>
				</div>

				<!-- Admins View -->
				<div v-else :key="'admins'" :class="$style.adminsView">
					<N8nText tag="p" size="small" color="text-light" :class="$style.adminsDescription">
						{{ i18n.baseText('projects.settings.role.contactAdmin.admins.description') }}
					</N8nText>
					<ul :class="$style.adminsList">
						<li v-for="admin in instanceAdmins" :key="admin.id" :class="$style.adminItem">
							<N8nAvatar
								:first-name="admin.firstName ?? undefined"
								:last-name="admin.lastName ?? undefined"
								size="small"
							/>
							<div :class="$style.adminInfo">
								<N8nText tag="span" size="small" :bold="true">
									{{ getUserDisplayName(admin) }}
									<template v-if="admin.id === usersStore.currentUser?.id">
										({{ i18n.baseText('generic.you') }})
									</template>
								</N8nText>
								<N8nText v-if="admin.email" tag="span" size="small" color="text-light">
									{{ admin.email }}
								</N8nText>
							</div>
						</li>
					</ul>
				</div>
			</Transition>
		</div>

		<template #footer>
			<div v-if="currentView === 'main'" :class="$style.footer">
				<N8nButton type="secondary" @click="onClose">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="primary" @click="showAdminsView">
					{{ i18n.baseText('projects.settings.role.contactAdmin.viewAdmins') }}
				</N8nButton>
			</div>
		</template>
	</ElDialog>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.backButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: none;
	background: transparent;
	border-radius: var(--radius);
	cursor: pointer;
	color: var(--color--text);

	&:hover {
		background-color: var(--color--background--light-1);
	}
}

.content {
	min-height: 120px;
	overflow: hidden;
}

.mainView,
.adminsView {
	padding: var(--spacing--xs) 0;
}

.adminsDescription {
	margin-bottom: var(--spacing--sm);
}

.adminsList {
	list-style: none;
	padding: 0;
	margin: 0;
}

.adminItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) 0;
}

.adminInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>

<style lang="scss">
/* Slide transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
	transition: all 0.2s ease-out;
}

.slide-left-enter-from {
	opacity: 0;
	transform: translateX(20px);
}

.slide-left-leave-to {
	opacity: 0;
	transform: translateX(-20px);
}

.slide-right-enter-from {
	opacity: 0;
	transform: translateX(-20px);
}

.slide-right-leave-to {
	opacity: 0;
	transform: translateX(20px);
}
</style>
