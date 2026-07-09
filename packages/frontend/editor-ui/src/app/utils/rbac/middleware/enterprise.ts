import type { RouterMiddleware } from '@/app/types/router';
import { VIEWS } from '@/app/constants';
import type { EnterprisePermissionOptions } from '@/app/types/rbac';
import { isEnterpriseFeatureEnabled } from '@/app/utils/rbac/checks';

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
