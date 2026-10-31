/**
 * Local re-export shim for reka-ui.
 *
 * Listbox.vue and ListboxItem.vue import reka-ui through this shim.
 * Storybook's vue-docgen-plugin resolves package imports from this folder to a
 * broken relative path:
 *
 *   src/components/N8nListbox/ → ../../../node_modules/reka-ui/dist/index.js
 *   (vue-docgen may resolve this incorrectly; keep imports behind this shim)
 *
 * Types are re-exported here so .vue files in this folder never import
 * 'reka-ui' directly.
 */
export { ListboxContent, ListboxItem, ListboxRoot, useForwardProps } from 'reka-ui';
