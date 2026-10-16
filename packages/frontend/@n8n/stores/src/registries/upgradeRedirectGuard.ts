import type { UpgradeRedirectGuard } from '../composables/useBasePageRedirectionHelper';

/**
 * The guard `useBasePageRedirectionHelper` consults when a caller supplies none.
 *
 * A module package cannot reach the shell, so it cannot pass the app's guard (the
 * AI-builder streaming confirmation) itself. The shell registers that guard here
 * once at init; a module then calls the base composable with no argument and gets
 * the same confirmation an in-shell caller gets.
 *
 * The fallback proceeds, so a test or a boot path that registers nothing behaves
 * as it did before any guard existed.
 */
let registered: UpgradeRedirectGuard | undefined;

const proceed: UpgradeRedirectGuard = async () => await Promise.resolve(true);

export function setDefaultUpgradeRedirectGuard(guard: UpgradeRedirectGuard): void {
	registered = guard;
}

export function getDefaultUpgradeRedirectGuard(): UpgradeRedirectGuard {
	return registered ?? proceed;
}

/** Test isolation only. */
export function clearDefaultUpgradeRedirectGuard(): void {
	registered = undefined;
}
