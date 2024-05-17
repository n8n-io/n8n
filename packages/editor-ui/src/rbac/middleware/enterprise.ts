import type { RouterMiddleware } from '@/types/router';
import { VIEWS } from '@/constants';
import type { EnterprisePermissionOptions } from '@/types/rbac';
import { isEnterpriseFeatureEnabled } from '@/rbac/checks';

export const enterpriseMiddleware: RouterMiddleware<EnterprisePermissionOptions> = async (
	_to,
	_from,
	next,
	options,
) => {
	const valid = isEnterpriseFeatureEnabled(options);
	if (!valid) {
		return next({ name: VIEWS.HOMEPAGE });
	}
};
