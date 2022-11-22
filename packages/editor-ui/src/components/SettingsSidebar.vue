<template>
	<div :class="$style.container">
		<n8n-menu :items="sidebarMenuItems" @select="handleSelect">
			<template #header>
				<div :class="$style.returnButton" @click="$emit('return')">
					<i class="mr-xs">
						<font-awesome-icon icon="arrow-left" />
					</i>
					<n8n-heading size="large" :bold="true">{{ $locale.baseText('settings') }}</n8n-heading>
				</div>
			</template>
			<template #menuSuffix>
				<div :class="$style.versionContainer">
					<n8n-link @click="onVersionClick" size="small">
						{{ $locale.baseText('settings.version') }} {{ rootStore.versionCli }}
					</n8n-link>
				</div>
			</template>
		</n8n-menu>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { ABOUT_MODAL_KEY, VERSIONS_MODAL_KEY, VIEWS } from '@/constants';
import { userHelpers } from './mixins/userHelpers';
import { pushConnection } from "@/components/mixins/pushConnection";
import { IFakeDoor } from '@/Interface';
import { IMenuItem } from 'n8n-design-system';
import { BaseTextKey } from '@/plugins/i18n';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useRootStore } from '@/stores/n8nRootStore';

export default mixins(
	userHelpers,
	pushConnection,
).extend({
	name: 'SettingsSidebar',
	computed: {
		...mapStores(
			useRootStore,
			useSettingsStore,
			useUIStore,
		),
		settingsFakeDoorFeatures(): IFakeDoor[] {
			return this.uiStore.getFakeDoorByLocation('settings');
		},
		sidebarMenuItems(): IMenuItem[] {

			const menuItems: IMenuItem[] = [
				{
					id: 'settings-personal',
					icon: 'user-circle',
					label: this.$locale.baseText('settings.personal'),
					position: 'top',
					available: this.canAccessPersonalSettings(),
					activateOnRouteNames: [ VIEWS.PERSONAL_SETTINGS ],
				},
				{
					id: 'settings-users',
					icon: 'user-friends',
					label: this.$locale.baseText('settings.users'),
					position: 'top',
					available: this.canAccessUsersSettings(),
					activateOnRouteNames: [ VIEWS.USERS_SETTINGS ],
				},
				{
					id: 'settings-api',
					icon: 'plug',
					label: this.$locale.baseText('settings.n8napi'),
					position: 'top',
					available: this.canAccessApiSettings(),
					activateOnRouteNames: [ VIEWS.API_SETTINGS ],
				},
			];

			for (const item of this.settingsFakeDoorFeatures) {
				if (item.uiLocations.includes('settings')) {
					menuItems.push({
						id: item.id,
						icon: item.icon || 'question',
						label: this.$locale.baseText(item.featureName as BaseTextKey),
						position: 'top',
						available: true,
						activateOnRoutePaths: [ `/settings/coming-soon/${item.id}` ],
					});
				}
			}

			menuItems.push(
				{
					id: 'settings-community-nodes',
					icon: 'cube',
					label: this.$locale.baseText('settings.communityNodes'),
					position: 'top',
					available: this.canAccessCommunityNodes(),
					activateOnRouteNames: [ VIEWS.COMMUNITY_NODES ],
				},
			);

			return menuItems;
		},
	},
	mounted() {
		this.pushConnect();
	},
	methods: {
		canAccessPersonalSettings(): boolean {
			return this.canUserAccessRouteByName(VIEWS.PERSONAL_SETTINGS);
		},
		canAccessUsersSettings(): boolean {
			return this.canUserAccessRouteByName(VIEWS.USERS_SETTINGS);
		},
		canAccessCommunityNodes(): boolean {
			return this.canUserAccessRouteByName(VIEWS.COMMUNITY_NODES);
		},
		canAccessApiSettings(): boolean {
			return this.canUserAccessRouteByName(VIEWS.API_SETTINGS);
		},
		onVersionClick() {
			this.uiStore.openModal(ABOUT_MODAL_KEY);
		},
		openUpdatesPanel() {
			this.uiStore.openModal(VERSIONS_MODAL_KEY);
		},
		async handleSelect (key: string) {
			switch (key) {
				case 'settings-personal':
					if (this.$router.currentRoute.name !== VIEWS.PERSONAL_SETTINGS) {
						this.$router.push({ name: VIEWS.PERSONAL_SETTINGS });
					}
					break;
				case 'settings-users':
					if (this.$router.currentRoute.name !== VIEWS.USERS_SETTINGS) {
						this.$router.push({ name: VIEWS.USERS_SETTINGS });
					}
					break;
				case 'settings-api':
					if (this.$router.currentRoute.name !== VIEWS.API_SETTINGS) {
						this.$router.push({ name: VIEWS.API_SETTINGS });
					}
					break;
				case 'users': // Fakedoor feature added via hooks when user management is disabled on cloud
				case 'environments':
				case 'logging':
					this.$router.push({ name: VIEWS.FAKE_DOOR, params: { featureId: key } }).catch(() => {});
					break;
				case 'settings-community-nodes':
					if (this.$router.currentRoute.name !== VIEWS.COMMUNITY_NODES) {
						this.$router.push({ name: VIEWS.COMMUNITY_NODES });
					}
					break;
				default:
					break;
			}
		},
	},
});
</script>

<style lang="scss" module>

.container {
	min-width: $sidebar-expanded-width;
	height: 100vh;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
	position: relative;
	overflow: auto;

}

.returnButton {
	padding: var(--spacing-s) var(--spacing-l);
	cursor: pointer;
	&:hover {
		color: var(--color-primary);
	}
}

@media screen and (max-height: 420px) {
	.updatesSubmenu, .versionContainer { display: none; }
}
</style>
