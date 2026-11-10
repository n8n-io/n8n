import { toValue, type MaybeRefOrGetter } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';

/**
 * Back within the app when there is somewhere to go back to; otherwise
 * navigates to `fallback`. A direct visit (no matched previous route) has
 * nowhere to go back to, so it falls through to `fallback` instead.
 */
export function useBackOrFallback(fallback: MaybeRefOrGetter<RouteLocationRaw>) {
	const router = useRouter();

	return function goBackOrFallback(): void {
		const previousRoute = router.options.history.state.back;
		const resolved = typeof previousRoute === 'string' ? router.resolve(previousRoute) : null;
		if (resolved?.matched.length) {
			router.back();
			return;
		}
		void router.push(toValue(fallback));
	};
}
