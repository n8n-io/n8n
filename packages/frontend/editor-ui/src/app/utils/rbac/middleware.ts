import type { RouterMiddleware, RouterMiddlewareType, MiddlewareOptions } from '@/app/types/router';
import { authenticatedMiddleware } from '@/app/utils/rbac/middleware/authenticated';
import { guestMiddleware } from '@/app/utils/rbac/middleware/guest';
import { rbacMiddleware } from '@/app/utils/rbac/middleware/rbac';
import { roleMiddleware } from '@/app/utils/rbac/middleware/role';
import { customMiddleware } from '@/app/utils/rbac/middleware/custom';
import { defaultUserMiddleware } from '@/app/utils/rbac/middleware/defaultUser';

type Middleware = {
	[key in RouterMiddlewareType]: RouterMiddleware<MiddlewareOptions[key]>;
};

export const middleware: Middleware = {
	authenticated: authenticatedMiddleware,
	custom: customMiddleware,
	defaultUser: defaultUserMiddleware,
	guest: guestMiddleware,
	rbac: rbacMiddleware,
	role: roleMiddleware,
};
