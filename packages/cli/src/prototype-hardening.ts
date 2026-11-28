import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import path from 'node:path';

import { lockBuiltinPrototypes } from './prototype-hardening-core';

// Source tests and packaged code both load worker modules from dist.
export const PROTOTYPE_HARDENING_MODULE_PATH = path.resolve(
	__dirname,
	'../dist/prototype-hardening-core.js',
);

/** Worker threads have their own prototypes, so they read this to lock them too. */
export function isPrototypeHardeningEnabled() {
	return !Container.get(GlobalConfig).security.disablePrototypeHardening;
}

/**
 * Stops new properties on built-in prototypes, so no code can add keys that every object,
 * array, function, number or boolean inherits.
 * Existing properties, including the `__proto__` accessor, keep working as before.
 */
export function applyPrototypeHardening() {
	if (!isPrototypeHardeningEnabled()) return;
	lockBuiltinPrototypes();
}
