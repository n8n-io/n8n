import { PostHog } from '.';

declare module 'vue/types/vue' {
	interface Vue {
		$posthog: PostHog;
	}
}

declare global {
	interface Window {
		posthog?: {
			isFeatureEnabled(flagName: string): boolean;
			getFeatureFlag(flagName: string): boolean | string;
			identify(
				id: string,
				userProperties?: Record<string, string>,
				userPropertiesOnce?: Record<string, string>,
			): void;
			reset(resetDeviceId?: boolean): void;
		};
	}
}
