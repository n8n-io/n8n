import { useRouter } from 'vue-router';

import type { InstanceLocation } from '../resources/resourceUrl';

/** Gives a function that reads where the editor of this instance is served. */
export function useInstanceLocation(): () => InstanceLocation {
	const router = useRouter();
	return () => ({ origin: window.location.origin, basePath: router.options.history.base });
}
