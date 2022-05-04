import { IPermissions } from '@/Interface';
import { isAuthorized } from '@/modules/userHelpers';
import Vue from 'vue';
import { Route } from 'vue-router';

export const userHelpers = Vue.extend({
	methods: {
		canUserAccessRouteByName(name: string): boolean {
			const {route} = this.$router.resolve({name});

			return this.canUserAccessRoute(route);
		},

		canUserAccessCurrentRoute() {
			return this.canUserAccessRoute(this.$route);
		},

		canUserAccessRoute(route: Route): boolean {
			const permissions: IPermissions = route.meta && route.meta.permissions;
			const currentUser = this.$store.getters['users/currentUser'];
			const isUMEnabled = this.$store.getters['settings/isUserManagementEnabled'];

			if (permissions && isAuthorized(permissions, { currentUser, isUMEnabled })) {
				return true;
			}
			return false;
		},
	},
});
