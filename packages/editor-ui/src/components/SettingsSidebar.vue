<template>
	<div :class="$style.container">
		<n8n-menu :router="true" :default-active="$route.path" type="secondary">
			<div :class="$style.returnButton" @click="onReturn">
				<i :class="$style.icon">
					<font-awesome-icon icon="arrow-left" />
				</i>
				<n8n-heading slot="title" size="large" :bold="true">{{ $locale.baseText('settings') }}</n8n-heading>
			</div>
			<n8n-menu-item index="/settings/personal" v-if="canAccessPersonalSettings()" :class="$style.tab">
				<i :class="$style.icon">
					<font-awesome-icon icon="user-circle" />
				</i>
				<span slot="title">{{ $locale.baseText('settings.personal') }}</span>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/users" v-if="canAccessUsersSettings()" :class="$style.tab">
				<i :class="$style.icon">
					<font-awesome-icon icon="user-friends" />
				</i>
				<span slot="title">{{ $locale.baseText('settings.users') }}</span>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/api" v-if="canAccessApiSettings()" :class="$style.tab">
				<i :class="$style.icon">
					<font-awesome-icon icon="plug" />
				</i>
				<span slot="title">{{ $locale.baseText('settings.n8napi') }}</span>
			</n8n-menu-item>
			<n8n-menu-item
				v-for="fakeDoor in settingsFakeDoorFeatures"
				v-bind:key="fakeDoor.featureName"
				:index="`/settings/coming-soon/${fakeDoor.id}`"
				:class="$style.tab"
			>
				<i :class="$style.icon">
					<font-awesome-icon :icon="fakeDoor.icon" />
				</i>
				<span slot="title">{{ $locale.baseText(fakeDoor.featureName) }}</span>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/community-nodes" v-if="canAccessCommunityNodes()" :class="$style.tab">
				<i :class="$style.icon">
					<font-awesome-icon icon="cube" />
				</i>
				<span slot="title">{{ $locale.baseText('settings.communityNodes') }}</span>
			</n8n-menu-item>
			<n8n-menu-item :class="$style.updatesSubmenu" v-if="hasVersionUpdates" @click="openUpdatesPanel">
				<div :class="$style.giftContainer">
					<GiftNotificationIcon />
				</div>
				<span slot="title" :class="['item-title-root', $style.updatesLabel]">
					{{nextVersions.length > 99 ? '99+' : nextVersions.length}} update{{nextVersions.length > 1 ? 's' : ''}}
				</span>
			</n8n-menu-item>
		</n8n-menu>
		<div :class="$style.versionContainer">
			<n8n-link @click="onVersionClick" size="small">
				{{ $locale.baseText('settings.version') }} {{ versionCli }}
			</n8n-link>
		</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { mapGetters } from 'vuex';
import { ABOUT_MODAL_KEY, VERSIONS_MODAL_KEY, VIEWS } from '@/constants';
import { userHelpers } from './mixins/userHelpers';
import { IFakeDoor } from '@/Interface';
import GiftNotificationIcon from './GiftNotificationIcon.vue';

export default mixins(
	userHelpers,
).extend({
	name: 'SettingsSidebar',
	components: {
		GiftNotificationIcon,
	},
	computed: {
		...mapGetters('settings', ['versionCli']),
		...mapGetters('versions', [
			'hasVersionUpdates',
			'nextVersions',
		]),
		settingsFakeDoorFeatures(): IFakeDoor[] {
			return this.$store.getters['ui/getFakeDoorByLocation']('settings');
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
		onVersionClick() {
			this.$store.dispatch('ui/openModal', ABOUT_MODAL_KEY);
		},
		onReturn() {
			this.$router.push({name: VIEWS.HOMEPAGE});
		},
		openUpdatesPanel() {
			this.$store.dispatch('ui/openModal', VERSIONS_MODAL_KEY);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	min-width: 200px;
	height: 100%;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
	position: relative;
	padding: var(--spacing-xs);

	ul {
		height: 100%;
	}
}

.tab {
	margin-bottom: var(--spacing-2xs);
}

.returnButton {
	composes: tab;
	margin-bottom: var(--spacing-xl);
	padding: 0 var(--spacing-xs);
	height: 38px;
	display: flex;
	align-items: center;
	color: var(--color-text-base);
	font-size: var(--font-size-s);
	cursor: pointer;

	i {
		color: var(--color-text-light);
	}

	&:hover > * {
		color: var(--color-primary);
	}
}

.icon {
	width: 16px;
	display: inline-flex;
	margin-right: 10px;
}

.updatesSubmenu {
	position: absolute;
	bottom: 25px;
	color: $--sidebar-inactive-color !important;

	.updatesLabel {
		position: relative;
		left: 10px;
		font-size: var(--font-size-xs);
	}

	&:hover {
		// color: $--sidebar-active-color;
	}

	.giftContainer {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		height: 100%;
		width: 100%;
	}
}

.versionContainer {
	position: absolute;
	left: 23px;
	bottom: 20px;
}
</style>
