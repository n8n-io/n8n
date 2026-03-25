import { E_ALREADY_LOCKED } from './errors';
import { withTimeout } from './withTimeout';
// eslint-disable-next-lisne @typescript-eslint/explicit-module-boundary-types
export function tryAcquire(sync, alreadyAcquiredError) {
    if (alreadyAcquiredError === void 0) { alreadyAcquiredError = E_ALREADY_LOCKED; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return withTimeout(sync, 0, alreadyAcquiredError);
}
