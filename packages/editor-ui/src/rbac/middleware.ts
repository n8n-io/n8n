import type { RouterMiddleware, RouterMiddlewareType, MiddlewareOptions } from '@/types/router';
import { authenticatedMiddleware } from '@/rbac/middleware/authenticated';
import { enterpriseMiddleware } from '@/rbac/middleware/enterprise';
import { guestMiddleware } from '@/rbac/middleware/guest';
import { rbacMiddleware } from '@/rbac/middleware/rbac';
import { roleMiddleware } from '@/rbac/middleware/role';
import { customMiddleware } from '@/rbac/middleware/custom';

type Middleware = {
	[key in RouterMiddlewareType]: RouterMiddleware<MiddlewareOptions[key]>;
};

export const middleware: Middleware = {
	authenticated: authenticatedMiddleware,
	custom: customMiddleware,
	enterprise: enterpriseMiddleware,
	guest: guestMiddleware,
	rbac: rbacMiddleware,
	role: roleMiddleware,
};
