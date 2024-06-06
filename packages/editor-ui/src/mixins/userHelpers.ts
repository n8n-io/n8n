import { defineComponent } from 'vue';
import type { RouteLocation } from 'vue-router';
import { hasPermission } from '@/utils/rbac/permissions';
import type { RouteConfig } from '@/types/router';
import type { PermissionTypeOptions } from '@/types/rbac';

export const userHelpers = defineComponent({
	methods: {
		canUserAccessRouteByName(name: string) {
			const route = this.$router.resolve({ name });

			return this.canUserAccessRoute(route);
		},

		canUserAccessCurrentRoute() {
			return this.canUserAccessRoute(this.$route);
		},

		canUserAccessRoute(route: RouteLocation & RouteConfig) {
			const middleware = route.meta?.middleware;
			const middlewareOptions = route.meta?.middlewareOptions;

			if (!middleware) {
				return true;
			}

			return hasPermission(middleware, middlewareOptions as PermissionTypeOptions | undefined);
		},
	},
});
