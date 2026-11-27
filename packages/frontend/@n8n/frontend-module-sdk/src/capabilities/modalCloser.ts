import { declareCapability } from '../declareCapability';
import type { ModalCloser } from '../types/capability';

/**
 * Closes a modal. Modal state lives in the shell's `ui.store`, which a module
 * cannot reach. A module modal that `DynamicModalLoader` renders uses this to
 * close itself.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const modalCloser = declareCapability<ModalCloser>('modal-closer');
