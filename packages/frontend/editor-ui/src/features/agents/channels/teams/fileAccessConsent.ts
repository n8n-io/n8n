import { ref } from 'vue';

/**
 * Set when Microsoft returns from an approved file access consent. The
 * settings then wait before the first check: Microsoft takes a moment to apply
 * the approval, and checking at once shows "not approved" first.
 */
export const fileAccessJustApproved = ref(false);
