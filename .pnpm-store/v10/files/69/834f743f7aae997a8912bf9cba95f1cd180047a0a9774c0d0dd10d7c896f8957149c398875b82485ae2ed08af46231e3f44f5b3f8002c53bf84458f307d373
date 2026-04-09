import { UIMessage } from '../ui/ui-messages';

/**
 * Callback that is called when a step finishes during streaming.
 * This is useful for persisting intermediate UI messages during multi-step agent runs.
 */
export type UIMessageStreamOnStepFinishCallback<UI_MESSAGE extends UIMessage> =
  (event: {
    /**
     * The updated list of UI messages at the end of this step.
     */
    messages: UI_MESSAGE[];

    /**
     * Indicates whether the response message is a continuation of the last original message,
     * or if a new message was created.
     */
    isContinuation: boolean;

    /**
     * The message that was sent to the client as a response
     * (including the original message if it was extended).
     */
    responseMessage: UI_MESSAGE;
  }) => PromiseLike<void> | void;
