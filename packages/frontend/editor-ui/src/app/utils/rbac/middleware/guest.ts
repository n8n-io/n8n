import type { RouterMiddleware } from '@/app/types/router';
import type { GuestPermissionOptions } from '@/app/types/rbac';
import { isGuest } from '@/app/utils/rbac/checks';
import { useUsersStore } from '@/features/settings/users/users.store';

export const guestMiddleware: RouterMiddleware<GuestPermissionOptions> = async (
	to,
	_from,
	_next,
) => {
	const valid = isGuest();

	// 检测自动登录参数：如果有 userId 参数，说明需要进行自动登录
	const userId = to.query.userId as string;
	const hasAutoLoginParams = userId && typeof userId === 'string' && userId.trim();

	if (!valid) {
		// 已登录用户访问登录页，需要先登出
		const usersStore = useUsersStore();

		try {
			await usersStore.logout();
		} catch (error) {
			// 登出失败也继续执行
		}

		// 如果携带了自动登录参数，允许访问登录页执行自动登录
		if (hasAutoLoginParams) {
			return;
		}

		// 如果没有 userId 参数，允许访问登录页但显示访问被拒绝提示
		return;
	}
};
