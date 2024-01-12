<template>
	<div :class="$style.container">
		<n8n-menu :items="sidebarMenuItems" @select="handleSelect">
			<template #header>
				<div :class="$style.returnButton" data-test-id="settings-back" @click="$emit('return')">
					<i class="mr-xs">
						<font-awesome-icon icon="arrow-left" />
					</i>
					<n8n-heading size="large" :bold="true">{{ $locale.baseText('settings') }}</n8n-heading>
				</div>
			</template>
			<template #menuSuffix>
				<div :class="$style.versionContainer">
					<n8n-link size="small" @click="onVersionClick">
						{{ $locale.baseText('settings.version') }} {{ rootStore.versionCli }}
					</n8n-link>
				</div>
			</template>
		</n8n-menu>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { ABOUT_MODAL_KEY, VERSIONS_MODAL_KEY, VIEWS } from '@/constants';
import { userHelpers } from '@/mixins/userHelpers';
import type { IFakeDoor } from '@/Interface';
import type { IMenuItem } from 'n8n-design-system';
import type { BaseTextKey } from '@/plugins/i18n';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { hasPermission } from '@/rbac/permissions';

export default defineComponent({
	name: 'SettingsSidebar',
	mixins: [userHelpers],
	computed: {
		...mapStores(useRootStore, useSettingsStore, useUIStore),
		settingsFakeDoorFeatures(): IFakeDoor[] {
			return this.uiStore.getFakeDoorByLocation('settings');
		},
		sidebarMenuItems(): IMenuItem[] {
			const menuItems: IMenuItem[] = [
				{
					id: 'settings-usage-and-plan',
					icon: 'chart-bar',
					label: this.$locale.baseText('settings.usageAndPlan.title'),
					position: 'top',
					available: this.canAccessUsageAndPlan(),
					activateOnRouteNames: [VIEWS.USAGE],
				},
				{
					id: 'settings-personal',
					icon: 'user-circle',
					label: this.$locale.baseText('settings.personal'),
					position: 'top',
					available: this.canAccessPersonalSettings(),
					activateOnRouteNames: [VIEWS.PERSONAL_SETTINGS],
				},
				{
					id: 'settings-users',
					icon: 'user-friends',
					label: this.$locale.baseText('settings.users'),
					position: 'top',
					available: this.canAccessUsersSettings(),
					activateOnRouteNames: [VIEWS.USERS_SETTINGS],
				},
				{
					id: 'settings-api',
					icon: 'plug',
					label: this.$locale.baseText('settings.n8napi'),
					position: 'top',
					available: this.canAccessApiSettings(),
					activateOnRouteNames: [VIEWS.API_SETTINGS],
				},
				{
					id: 'settings-external-secrets',
					icon: 'vault',
					label: this.$locale.baseText('settings.externalSecrets.title'),
					position: 'top',
					available: this.canAccessExternalSecrets(),
					activateOnRouteNames: [
						VIEWS.EXTERNAL_SECRETS_SETTINGS,
						VIEWS.EXTERNAL_SECRETS_PROVIDER_SETTINGS,
					],
				},
				{
					id: 'settings-audit-logs',
					icon: 'clipboard-list',
					label: this.$locale.baseText('settings.auditLogs.title'),
					position: 'top',
					available: this.canAccessAuditLogs(),
					activateOnRouteNames: [VIEWS.AUDIT_LOGS],
				},
				{
					id: 'settings-source-control',
					icon: 'code-branch',
					label: this.$locale.baseText('settings.sourceControl.title'),
					position: 'top',
					available: this.canAccessSourceControl(),
					activateOnRouteNames: [VIEWS.SOURCE_CONTROL],
				},
				{
					id: 'settings-sso',
					icon: 'user-lock',
					label: this.$locale.baseText('settings.sso'),
					position: 'top',
					available: this.canAccessSso(),
					activateOnRouteNames: [VIEWS.SSO_SETTINGS],
				},
				{
					id: 'settings-ldap',
					icon: 'network-wired',
					label: this.$locale.baseText('settings.ldap'),
					position: 'top',
					available: this.canAccessLdapSettings(),
					activateOnRouteNames: [VIEWS.LDAP_SETTINGS],
				},
				{
					id: 'settings-workersview',
					icon: 'project-diagram',
					label: this.$locale.baseText('mainSidebar.workersView'),
					position: 'top',
					available:
						this.settingsStore.isQueueModeEnabled &&
						hasPermission(['rbac'], { rbac: { scope: 'workersView:manage' } }),
					activateOnRouteNames: [VIEWS.WORKER_VIEW],
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
						activateOnRoutePaths: [`/settings/coming-soon/${item.id}`],
					});
				}
			}

			menuItems.push({
				id: 'settings-log-streaming',
				icon: 'sign-in-alt',
				label: this.$locale.baseText('settings.log-streaming'),
				position: 'top',
				available: this.canAccessLogStreamingSettings(),
				activateOnRouteNames: [VIEWS.LOG_STREAMING_SETTINGS],
			});

			menuItems.push({
				id: 'settings-community-nodes',
				icon: 'cube',
				label: this.$locale.baseText('settings.communityNodes'),
				position: 'top',
				available: this.canAccessCommunityNodes(),
				activateOnRouteNames: [VIEWS.COMMUNITY_NODES],
			});

			return menuItems;
		},
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
		canAccessLdapSettings(): boolean {
			return this.canUserAccessRouteByName(VIEWS.LDAP_SETTINGS);
		},
		canAccessLogStreamingSettings(): boolean {
			return this.canUserAccessRouteByName(VIEWS.LOG_STREAMING_SETTINGS);
		},
		canAccessUsageAndPlan(): boolean {
			return this.canUserAccessRouteByName(VIEWS.USAGE);
		},
		canAccessExternalSecrets(): boolean {
			return this.canUserAccessRouteByName(VIEWS.EXTERNAL_SECRETS_SETTINGS);
		},
		canAccessSourceControl(): boolean {
			return this.canUserAccessRouteByName(VIEWS.SOURCE_CONTROL);
		},
		canAccessAuditLogs(): boolean {
			return this.canUserAccessRouteByName(VIEWS.AUDIT_LOGS);
		},
		canAccessSso(): boolean {
			return this.canUserAccessRouteByName(VIEWS.SSO_SETTINGS);
		},
		onVersionClick() {
			this.uiStore.openModal(ABOUT_MODAL_KEY);
		},
		openUpdatesPanel() {
			this.uiStore.openModal(VERSIONS_MODAL_KEY);
		},
		async navigateTo(routeName: (typeof VIEWS)[keyof typeof VIEWS]) {
			if (this.$router.currentRoute.name !== routeName) {
				await this.$router.push({ name: routeName });
			}
		},
		async handleSelect(key: string) {
			switch (key) {
				case 'settings-personal':
					await this.navigateTo(VIEWS.PERSONAL_SETTINGS);
					break;
				case 'settings-users':
					await this.navigateTo(VIEWS.USERS_SETTINGS);
					break;
				case 'settings-api':
					await this.navigateTo(VIEWS.API_SETTINGS);
					break;
				case 'settings-ldap':
					await this.navigateTo(VIEWS.LDAP_SETTINGS);
					break;
				case 'settings-log-streaming':
					await this.navigateTo(VIEWS.LOG_STREAMING_SETTINGS);
					break;
				case 'users': // Fakedoor feature added via hooks when user management is disabled on cloud
				case 'logging':
					this.$router.push({ name: VIEWS.FAKE_DOOR, params: { featureId: key } }).catch(() => {});
					break;
				case 'settings-community-nodes':
					await this.navigateTo(VIEWS.COMMUNITY_NODES);
					break;
				case 'settings-usage-and-plan':
					await this.navigateTo(VIEWS.USAGE);
					break;
				case 'settings-sso':
					await this.navigateTo(VIEWS.SSO_SETTINGS);
					break;
				case 'settings-external-secrets':
					await this.navigateTo(VIEWS.EXTERNAL_SECRETS_SETTINGS);
					break;
				case 'settings-source-control':
					if (this.$router.currentRoute.name !== VIEWS.SOURCE_CONTROL) {
						void this.$router.push({ name: VIEWS.SOURCE_CONTROL });
					}
					break;
				case 'settings-audit-logs':
					if (this.$router.currentRoute.name !== VIEWS.AUDIT_LOGS) {
						void this.$router.push({ name: VIEWS.AUDIT_LOGS });
					}
					break;
				case 'settings-workersview': {
					await this.navigateTo(VIEWS.WORKER_VIEW);
					break;
				}
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
	height: 100%;
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

.versionContainer {
	padding: var(--spacing-xs) var(--spacing-l);
}

@media screen and (max-height: 420px) {
	.versionContainer {
		display: none;
	}
}
</style>
