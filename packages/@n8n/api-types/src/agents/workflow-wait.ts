/**
 * Contract for the card an agent posts while a workflow tool is parked on a
 * Wait node. The backend produces the suspend payload
 * (`buildWaitCard` in `workflow-tool-factory.ts`); the editor-ui recognises it
 * to render the same card in the preview chat and to label the suspension in
 * the session trace.
 */

/** Discriminator on the suspend payload of a workflow tool parked on a Wait node. */
export const WORKFLOW_WAIT_SUSPEND_TYPE = 'workflow_wait' as const;

/**
 * Frontend-only discriminator for the waiting card, mirroring
 * `APPROVAL_TOOL_NAME`: the wire keeps the workflow tool's own name (it is
 * per-workflow and cannot be a literal), so the FE maps the suspension to this
 * value before dispatching to a card component.
 */
export const WAIT_TOOL_NAME = 'wait' as const;

/** Resume value of the card's "check for the result" button. */
export const WORKFLOW_WAIT_ACTION_CHECK = 'continue' as const;

/** Resume value of the card's "stop waiting" button. */
export const WORKFLOW_WAIT_ACTION_CANCEL = 'cancel' as const;
