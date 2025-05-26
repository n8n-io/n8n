import type { TestRunRecord } from '@/api/evaluation.ee';
import type { IconColor } from '@n8n/design-system/types/icon';

export const statusDictionary: Record<TestRunRecord['status'], { icon: string; color: IconColor }> =
	{
		new: {
			icon: 'status-new',
			color: 'foreground-xdark',
		},
		running: {
			icon: 'spinner',
			color: 'secondary',
		},
		completed: {
			icon: 'status-completed',
			color: 'success',
		},
		error: {
			icon: 'exclamation-triangle',
			color: 'danger',
		},
		cancelled: {
			icon: 'status-canceled',
			color: 'foreground-xdark',
		},
		warning: {
			icon: 'status-warning',
			color: 'warning',
		},
		success: {
			icon: 'status-completed',
			color: 'success',
		},
	};
