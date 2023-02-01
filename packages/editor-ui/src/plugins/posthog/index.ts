import { IUser } from '@/Interface';
import _Vue from 'vue';

export class PostHog {
	private userId: undefined | string;

	identify(instanceId: string, user?: IUser | null, versionCli?: string) {
		const traits: Record<string, string> = { instance_id: instanceId };
		if (versionCli) {
			traits.version_cli = versionCli;
		}
		if (user && user.createdAt instanceof Date) {
			traits.created_at = user.createdAt.toISOString();
		} else if (user && typeof user.createdAt === 'string') {
			traits.created_at = user.createdAt;
		}

		// logged out
		if (this.userId && !user) {
			window.posthog?.reset();
		}
		this.userId = user?.id;

		window.posthog?.identify(user ? `${instanceId}#${user.id}` : instanceId, traits);
	}
}

export const posthog = new PostHog();

export function PosthogPlugin(vue: typeof _Vue): void {
	Object.defineProperty(vue, '$posthog', {
		get() {
			return posthog;
		},
	});
	Object.defineProperty(vue.prototype, '$posthog', {
		get() {
			return posthog;
		},
	});
}
