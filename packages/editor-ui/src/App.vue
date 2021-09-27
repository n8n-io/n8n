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
			<Modals />
		</div>
		<Telemetry />
	</div>
</template>

<script lang="ts">
import Modals from './components/Modals.vue';
import LoadingView from './views/LoadingView.vue';
import Telemetry from './components/Telemetry.vue';

import mixins from 'vue-typed-mixins';
import { showMessage } from './components/mixins/showMessage';
import { IUser } from './Interface';

export default mixins(
	showMessage,
).extend({
	name: 'App',
	components: {
		LoadingView,
		Telemetry,
		Modals,
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
			}

			return true;
		},
		authenticate() {
			const isAuthorized = this.$store.getters['users/canCurrentUserAccessView'];

			if (isAuthorized(this.$router.currentRoute.name)) {
				this.loading = false;

				return;
			}

			const user = this.$store.getters['users/currentUser'] as IUser | null;
			if (!user) {
				const redirect = this.$route.query.redirect || encodeURIComponent(`${window.location.pathname}${window.location.search}`);
				this.$router.push({name: 'SigninView', query: { redirect }});
			}
			else {
				if (typeof this.$route.query.redirect === 'string') {
					const redirect = decodeURIComponent(this.$route.query.redirect);
					if (redirect.startsWith('/')) { // protect against phishing
						this.$router.push(redirect);
					}
				}
				else {
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

