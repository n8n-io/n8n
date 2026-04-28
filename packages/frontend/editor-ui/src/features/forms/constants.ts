export const FORMS_VIEW = 'forms';
export const FORMS_WORKFLOW_VIEW = 'forms-workflow';

/** Outer wrapper width (px) of the FormStepCard. Must match the CSS and the canvas X-offset calculation. */
export const FORM_STEP_WIDTH = 228;

/** Top and bottom padding (px) on the FormStepCard outer wrapper. */
export const FORM_STEP_PADDING = 20;

/** Zoom applied to the form-preview iframe so the 448 px card fits inside FORM_STEP_WIDTH. */
export const FORM_STEP_IFRAME_ZOOM = 0.45;

/**
 * Minimum gap (px) between the bottom edge of one FormStepCard wrapper and the top
 * edge of the next wrapper. Visual gap between the card content edges is
 * FORM_STEP_MIN_GAP + 2 × FORM_STEP_PADDING = 100 px.
 */
export const FORM_STEP_MIN_GAP = 60;
