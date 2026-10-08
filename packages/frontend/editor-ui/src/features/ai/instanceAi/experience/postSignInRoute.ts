import { VIEWS } from '@/app/constants';

/** The app root. Its route opens the Assistant when the user can use it, else the overview. */
export const APP_ROOT_PATH = '/';

export type PostSignInRoute = typeof APP_ROOT_PATH | { name: VIEWS.HOMEPAGE };

/**
 * Where the user goes after sign-in or sign-up when no safe redirect is given. With
 * experience modes on, the app opens on the chat in both modes. With the flag off, it
 * opens on the overview as before.
 */
export function postSignInRoute({
	experienceEnabled,
}: {
	experienceEnabled: boolean;
}): PostSignInRoute {
	return experienceEnabled ? APP_ROOT_PATH : { name: VIEWS.HOMEPAGE };
}
