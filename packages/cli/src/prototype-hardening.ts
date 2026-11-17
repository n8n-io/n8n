import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

/** Worker threads have their own `Object.prototype`, so they read this to apply the same lock. */
export function isPrototypeHardeningEnabled() {
	return !Container.get(GlobalConfig).security.disablePrototypeHardening;
}

/**
 * Stops new properties on `Object.prototype`, so no code can add keys that every object inherits.
 * Existing properties, including the `__proto__` accessor, keep working as before.
 */
export function applyPrototypeHardening() {
	if (isPrototypeHardeningEnabled()) Object.preventExtensions(Object.prototype);
}
