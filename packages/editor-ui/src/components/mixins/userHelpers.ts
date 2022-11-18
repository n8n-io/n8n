import { IPermissions, IUser } from '@/Interface';
import { isAuthorized } from '@/stores/userHelpers';
import { useUsersStore } from '@/stores/users';
import Vue from 'vue';
import { Route } from 'vue-router';

export const userHelpers = Vue.extend({
	methods: {
		canUserAccessRouteByName(name: string): boolean {
			const {route} = this.$router.resolve({name});

			return this.canUserAccessRoute(route);
		},

		canUserAccessCurrentRoute(): boolean {
			return this.canUserAccessRoute(this.$route);
		},

		canUserAccessRoute(route: Route): boolean {
			const permissions: IPermissions = route.meta && route.meta.permissions;
			const usersStore = useUsersStore();
			const currentUser = usersStore.currentUser;

			if (permissions && isAuthorized(permissions, currentUser)) {
				return true;
			}
			return false;
		},
	},
});
