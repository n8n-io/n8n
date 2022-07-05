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
import { ABOUT_MODAL_KEY, VIEWS } from '@/constants';
import { userHelpers } from './mixins/userHelpers';

export default mixins(
	userHelpers,
).extend({
	name: 'SettingsSidebar',
	computed: {
		...mapGetters('settings', ['versionCli']),
	},
	methods: {
		canAccessPersonalSettings(): boolean {
			return this.canUserAccessRouteByName(VIEWS.PERSONAL_SETTINGS);
		},
		canAccessUsersSettings(): boolean {
			return this.canUserAccessRouteByName(VIEWS.USERS_SETTINGS);
		},
		onVersionClick() {
			this.$store.dispatch('ui/openModal', ABOUT_MODAL_KEY);
		},
		onReturn() {
			this.$router.push({name: VIEWS.HOMEPAGE});
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
	padding: var(--spacing-s);
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
	width: 24px;
	display: inline-flex;
	justify-content: center;
	margin-right: 10px;
}

.versionContainer {
	position: absolute;
	left: 20px;
	bottom: 20px;
}
</style>
