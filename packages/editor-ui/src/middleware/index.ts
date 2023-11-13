import type { RouterMiddlewareType, RouterMiddleware } from '@/types/router';
import { authenticated } from './authenticated';
import { enterprise } from './enterprise';
import { guest } from './guest';
import { rbac } from './rbac';

export const middleware: Record<RouterMiddlewareType, RouterMiddleware> = {
	authenticated,
	enterprise,
	guest,
	rbac,
};
