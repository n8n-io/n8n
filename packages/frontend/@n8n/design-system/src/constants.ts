export const TOOLTIP_DELAY_MS = 500;

/**
 * Matches every popover and dialog layer (N8nPopover, N8nDialog) and the dialog backdrop.
 * A click on the backdrop belongs to the dialog, so a surface under it must not see it as outside.
 */
export const OVERLAY_LAYER_SELECTOR = '[data-dismissable-layer], [data-dialog-overlay]';
