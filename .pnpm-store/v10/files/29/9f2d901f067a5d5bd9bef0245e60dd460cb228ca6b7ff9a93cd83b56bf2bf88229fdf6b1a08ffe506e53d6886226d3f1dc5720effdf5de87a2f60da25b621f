import { FinishReason } from '../types/language-model';
import { UIMessage } from '../ui/ui-messages';

export type UIMessageStreamOnFinishCallback<UI_MESSAGE extends UIMessage> =
  (event: {
    /**
     * The updated list of UI messages.
     */
    messages: UI_MESSAGE[];

    /**
     * Indicates whether the response message is a continuation of the last original message,
     * or if a new message was created.
     */
    isContinuation: boolean;

    /**
     * Indicates whether the stream was aborted.
     */
    isAborted: boolean;

    /**
     * The message that was sent to the client as a response
     * (including the original message if it was extended).
     */
    responseMessage: UI_MESSAGE;

    /**
     * The reason why the generation finished.
     */
    finishReason?: FinishReason;
  }) => PromiseLike<void> | void;
