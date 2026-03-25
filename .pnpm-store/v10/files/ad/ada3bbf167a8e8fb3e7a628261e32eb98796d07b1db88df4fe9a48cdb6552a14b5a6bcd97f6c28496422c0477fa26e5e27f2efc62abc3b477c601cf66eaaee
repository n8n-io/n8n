//#region src/prebuilt/interrupt.d.ts
/**
 * Configuration interface that defines what actions are allowed for a human interrupt.
 * This controls the available interaction options when the graph is paused for human input.
 *
 * @property {boolean} allow_ignore - Whether the human can choose to ignore/skip the current step
 * @property {boolean} allow_respond - Whether the human can provide a text response/feedback
 * @property {boolean} allow_edit - Whether the human can edit the provided content/state
 * @property {boolean} allow_accept - Whether the human can accept/approve the current state
 */
interface HumanInterruptConfig {
  allow_ignore: boolean;
  allow_respond: boolean;
  allow_edit: boolean;
  allow_accept: boolean;
}
/**
 * Represents a request for human action within the graph execution.
 * Contains the action type and any associated arguments needed for the action.
 *
 * @property {string} action - The type or name of action being requested (e.g., "Approve XYZ action")
 * @property {Record<string, any>} args - Key-value pairs of arguments needed for the action
 */
interface ActionRequest {
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
}
/**
 * Represents an interrupt triggered by the graph that requires human intervention.
 * This is passed to the `interrupt` function when execution is paused for human input.
 *
 * @property {ActionRequest} action_request - The specific action being requested from the human
 * @property {HumanInterruptConfig} config - Configuration defining what actions are allowed
 * @property {string} [description] - Optional detailed description of what input is needed
 */
interface HumanInterrupt {
  action_request: ActionRequest;
  config: HumanInterruptConfig;
  description?: string;
}
/**
 * The response provided by a human to an interrupt, which is returned when graph execution resumes.
 *
 * @property {("accept"|"ignore"|"response"|"edit")} type - The type of response:
 *   - "accept": Approves the current state without changes
 *   - "ignore": Skips/ignores the current step
 *   - "response": Provides text feedback or instructions
 *   - "edit": Modifies the current state/content
 * @property {null|string|ActionRequest} args - The response payload:
 *   - null: For ignore/accept actions
 *   - string: For text responses
 *   - ActionRequest: For edit actions with updated content
 */
type HumanResponse = {
  type: "accept" | "ignore" | "response" | "edit";
  args: null | string | ActionRequest;
};
//#endregion
export { ActionRequest, HumanInterrupt, HumanInterruptConfig, HumanResponse };
//# sourceMappingURL=interrupt.d.cts.map