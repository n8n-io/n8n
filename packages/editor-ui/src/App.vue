<template>
	<div :class="$style.container">
		<LoadingView v-if="loading" />
		<div id="app" :class="$style.container" v-else>
			<div id="header" :class="$style.header">
				<router-view name="header"></router-view>
			</div>
			<div id="sidebar" :class="$style.sidebar">
				<router-view name="sidebar"></router-view>
			</div>
			<div id="content" :class="$style.container">
				<router-view />
			</div>
			<RootModals />
		</div>
		<Telemetry />
	</div>
</template>

<script lang="ts">
import RootModals from './components/RootModals.vue';
import LoadingView from './views/LoadingView.vue';
import Telemetry from './components/Telemetry.vue';

import mixins from 'vue-typed-mixins';
import { showMessage } from './components/mixins/showMessage';
import { LOGIN_STATUS } from './constants';
import { IUser } from './Interface';

export default mixins(
	showMessage,
).extend({
	name: 'App',
	components: {
		LoadingView,
		Telemetry,
		RootModals,
	},
	data() {
		return {
			loading: true,
		};
	},
	async mounted() {
		const initialized = await this.init();
		if (initialized) {
			this.authenticate();
		}
	},
	methods: {
		async init(): Promise<boolean> {
			try {
				await this.$store.dispatch('settings/fetchSettings');
			} catch (e) {
				this.$showToast({
					title: 'Error connecting to n8n',
					message: 'Could not connect to server. <a onclick="window.location.reload(false);" class="primary-color">Refresh</a> to try again',
					type: 'error',
					duration: 0,
				});

				return false;
			}

			try {
				await this.$store.dispatch('users/fetchCurrentUser');
			} catch (e) {
				this.$showToast({
					title: 'Error on log in',
					message: 'Could not log user in',
					type: 'error',
				});

				this.$router.push({name: 'SigninView'});
				return false;
			}

			return true;
		},
		authenticate() {
			const user = this.$store.getters['users/currentUser'] as IUser | null;
			const authorize: string[] = this.$router.currentRoute.meta ? this.$router.currentRoute.meta.authorize : null;
			if (authorize) {
				if (!user && !authorize.includes(LOGIN_STATUS.LoggedOut)) {
					this.$router.push({name: 'SigninView'});
				}
				if (user && (!authorize.includes(LOGIN_STATUS.LoggedIn) || !authorize.includes(user.role))) {
					this.$router.push({name: 'NodeViewNew'});
				}
			}

			this.loading = false;
		},
	},
	watch: {
		'$route'() {
			this.authenticate();
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
}
.header {
	z-index: 10;
	position: fixed;
	width: 100;
}

.sidebar {
	z-index: 15;
	position: fixed;
}
</style>

