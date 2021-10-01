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
import { mapGetters } from 'vuex';

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
		await this.initialize();
		this.authenticate();
	},
	computed: {
		...mapGetters('settings', ['isUserManagementEnabled', 'isInstanceSetup']),
		...mapGetters('users', ['canCurrentUserAccessView', 'currentUser']),
	},
	methods: {
		async initialize(): Promise<void> {
			try {
				await this.$store.dispatch('settings/fetchSettings');
			} catch (e) {
				this.$showToast({
					title: 'Error connecting to n8n',
					message: 'Could not connect to server. <a onclick="window.location.reload(false);">Refresh</a> to try again',
					type: 'error',
					duration: 0,
				});

				throw e;
			}

			if (!this.isUserManagementEnabled) {
				return;
			}

			try {
				await this.$store.dispatch('users/fetchCurrentUser');
			} catch (e) {
			}
		},
		authenticate() {
			if (!this.isUserManagementEnabled) {
				this.loading = false;

				if (this.$route.name && !['ExecutionById', 'NodeViewNew', 'NodeViewExisting', 'WorkflowTemplate'].includes(this.$route.name)) {
					this.$router.push('/404');
				}

				return;
			}

			if (!this.isInstanceSetup) {
				this.loading = false;
				if (this.$route.name === 'SetupView') {
					return;
				}

				this.$router.push({name: 'SetupView'});
				return;
			}

			if (this.$route.name === 'SetupView') {
				this.$router.push('/');

				this.loading = false;
				return;
			}

			if (this.canCurrentUserAccessView(this.$router.currentRoute.name)) {
				this.loading = false;

				return;
			}

			const user = this.currentUser as IUser | null;
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

