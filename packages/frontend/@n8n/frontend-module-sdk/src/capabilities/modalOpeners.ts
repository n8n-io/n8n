import { declareCapability } from '../declareCapability';
import type { ModalOpeners } from '../types/capability';

/**
 * Opens a shell-owned modal. Modals live in the shell's `ui.store`, which a
 * module cannot reach.
 */
export const modalOpeners = declareCapability<ModalOpeners>('modal-openers');
