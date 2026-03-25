import { load } from 'worker-timers-broker';
import { createLoadOrReturnBroker } from './factories/load-or-return-broker';
import { worker } from './worker/worker';
const loadOrReturnBroker = createLoadOrReturnBroker(load, worker);
export const clearInterval = (timerId) => loadOrReturnBroker().clearInterval(timerId);
export const clearTimeout = (timerId) => loadOrReturnBroker().clearTimeout(timerId);
export const setInterval = (...args) => loadOrReturnBroker().setInterval(...args);
export const setTimeout = (...args) => loadOrReturnBroker().setTimeout(...args);
//# sourceMappingURL=module.js.map