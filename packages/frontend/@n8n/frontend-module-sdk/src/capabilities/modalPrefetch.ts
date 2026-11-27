import { declareCapability } from '../declareCapability';
import type { ModalPrefetch } from '../types/capability';

/**
 * Loads the code of modals in the background after the page mounts, so the first
 * open makes no network request. The shell owns the prefetch, because its
 * `vite:preloadError` handler must know when a background load fails.
 *
 * Call the function during component setup: it registers lifecycle hooks.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const modalPrefetch = declareCapability<ModalPrefetch>('modal-prefetch');
