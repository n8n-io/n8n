// TEMP DEBUG (do not merge): catch an unhandled rejection in the vitest main process.
import { register } from './temp-unhandled-debug';

export function setup() {
	register();
}
