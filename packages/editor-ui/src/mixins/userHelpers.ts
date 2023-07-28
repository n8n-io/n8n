import type { IPermissions } from '@/Interface';
import { isAuthorized } from '@/utils';
import { useUsersStore } from '@/stores/users.store';
import { defineComponent } from 'vue';
import type { RouteLocation } from 'vue-router';

export const userHelpers = defineComponent({
	methods: {
		canUserAccessRouteByName(name: string): boolean {
			const route = this.$router.resolve({ name });

			return this.canUserAccessRoute(route);
		},

		canUserAccessCurrentRoute(): boolean {
			return this.canUserAccessRoute(this.$route);
		},

		canUserAccessRoute(route: RouteLocation): boolean {
			const permissions: IPermissions = route.meta && route.meta.permissions;
			const usersStore = useUsersStore();
			const currentUser = usersStore.currentUser;

			return permissions && isAuthorized(permissions, currentUser);
		},
	},
});
