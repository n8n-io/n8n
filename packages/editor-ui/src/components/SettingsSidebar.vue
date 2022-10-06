<template>
	<div :class="$style.container">
		<n8n-menu :router="true" :default-active="$route.path" type="secondary">
			<div :class="$style.returnButton" @click="onReturn">
				<i :class="$style.icon">
					<font-awesome-icon icon="arrow-left" />
				</i>
				<n8n-heading slot="title" size="large" :class="$style.settingsHeading" :bold="true">{{ $locale.baseText('settings') }}</n8n-heading>
			</div>
			<n8n-menu-item index="/settings/personal" v-if="canAccessPersonalSettings()" :class="$style.tab">
				<i :class="$style.icon">
					<font-awesome-icon icon="user-circle" />
				</i>
				<span slot="title">{{ $locale.baseText('settings.personal') }}</span>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/users" v-if="canAccessUsersSettings()" :class="[$style.tab, $style.usersMenu]">
				<i :class="$style.icon">
					<font-awesome-icon icon="user-friends" />
				</i>
				<span slot="title">{{ $locale.baseText('settings.users') }}</span>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/api" v-if="canAccessApiSettings()" :class="[$style.tab, $style.apiMenu]">
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
import { pushConnection } from "@/components/mixins/pushConnection";
import { IFakeDoor } from '@/Interface';
import GiftNotificationIcon from './GiftNotificationIcon.vue';

export default mixins(
	userHelpers,
	pushConnection,
).extend({
	name: 'SettingsSidebar',
	components: {
		GiftNotificationIcon,
	},
	computed: {
		...mapGetters('settings', ['versionCli']),
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
	mounted() {
		this.pushConnect();
	},
});
</script>

<style lang="scss" module>
:global(.el-menu) {
	--menu-item-height: 35px;
	--submenu-item-height: 27px;
}

.container {
	min-width: 200px;
	height: 100%;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
	position: relative;
	padding: var(--spacing-xs);
	overflow: auto;

	ul {
		height: 100%;
	}

	:global(.el-menu-item) > span{
		position: relative;
		left: 8px;
	}
}

.settingsHeading {
	position: relative;
	left: 8px;
}

.tab {
	margin-bottom: var(--spacing-2xs);
	svg:global(.svg-inline--fa) { position: relative; }
}

.returnButton {
	composes: tab;
	margin-bottom: var(--spacing-l);
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

.usersMenu svg { left: -2px; }
.apiMenu svg { left: 2px; }

.icon {
	width: 16px;
	display: inline-flex;
	margin-right: 10px;
}

.versionContainer {
	position: absolute;
	left: 23px;
	bottom: 20px;
}

@media screen and (max-height: 420px) {
	.updatesSubmenu, .versionContainer { display: none; }
}
</style>
