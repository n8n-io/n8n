import { BaseCallbackHandlerInput } from "../callbacks/base.cjs";

//#region src/tracers/event_stream.d.ts
/**
 * Data associated with a StreamEvent.
 */
type StreamEventData = {
  /**
   * The input passed to the runnable that generated the event.
   * Inputs will sometimes be available at the *START* of the runnable, and
   * sometimes at the *END* of the runnable.
   * If a runnable is able to stream its inputs, then its input by definition
   * won't be known until the *END* of the runnable when it has finished streaming
   * its inputs.
   */
  input?: any;
  /**
   * The output of the runnable that generated the event.
   * Outputs will only be available at the *END* of the runnable.
   * For most runnables, this field can be inferred from the `chunk` field,
   * though there might be some exceptions for special cased runnables (e.g., like
   * chat models), which may return more information.
   */
  output?: any;
  /**
   * A streaming chunk from the output that generated the event.
   * chunks support addition in general, and adding them up should result
   * in the output of the runnable that generated the event.
   */
  chunk?: any;
  /**
   * Error message if the runnable that generated the event failed.
   * This field will only be present if the runnable failed.
   */
  error?: string;
};
/**
 * A streaming event.
 *
 * Schema of a streaming event which is produced from the streamEvents method.
 */
type StreamEvent = {
  /**
   * Event names are of the format: on_[runnable_type]_(start|stream|end).
   *
   * Runnable types are one of:
   * - llm - used by non chat models
   * - chat_model - used by chat models
   * - prompt --  e.g., ChatPromptTemplate
   * - tool -- LangChain tools
   * - chain - most Runnables are of this type
   *
   * Further, the events are categorized as one of:
   * - start - when the runnable starts
   * - stream - when the runnable is streaming
   * - end - when the runnable ends
   *
   * start, stream and end are associated with slightly different `data` payload.
   *
   * Please see the documentation for `EventData` for more details.
   */
  event: string; /** The name of the runnable that generated the event. */
  name: string;
  /**
   * An randomly generated ID to keep track of the execution of the given runnable.
   *
   * Each child runnable that gets invoked as part of the execution of a parent runnable
   * is assigned its own unique ID.
   */
  run_id: string;
  /**
   * Tags associated with the runnable that generated this event.
   * Tags are always inherited from parent runnables.
   */
  tags?: string[]; /** Metadata associated with the runnable that generated this event. */
  metadata: Record<string, any>;
  /**
   * Event data.
   *
   * The contents of the event data depend on the event type.
   */
  data: StreamEventData;
};
interface EventStreamCallbackHandlerInput extends BaseCallbackHandlerInput {
  autoClose?: boolean;
  includeNames?: string[];
  includeTypes?: string[];
  includeTags?: string[];
  excludeNames?: string[];
  excludeTypes?: string[];
  excludeTags?: string[];
}
//#endregion
export { EventStreamCallbackHandlerInput, StreamEvent, StreamEventData };
//# sourceMappingURL=event_stream.d.cts.map