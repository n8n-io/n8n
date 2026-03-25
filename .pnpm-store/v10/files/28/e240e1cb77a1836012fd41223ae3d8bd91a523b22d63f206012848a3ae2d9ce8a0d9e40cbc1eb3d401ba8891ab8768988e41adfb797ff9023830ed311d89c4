import { TurnContext } from '../turnContext';
import { Middleware } from '../middlewareSet';
import { TranscriptLogger } from './transcriptLogger';
/**
 * Middleware for logging agent conversations to a transcript logger.
 */
export declare class TranscriptLoggerMiddleware implements Middleware {
    private logger;
    /**
     * Creates a new instance of the TranscriptLoggerMiddleware class.
     * @param logger The transcript logger to use.
     * @throws Will throw an error if the logger is not provided.
     */
    constructor(logger: TranscriptLogger);
    /**
     * Called each time the agent processes a turn.
     * @param context The context object for the turn.
     * @param next The next middleware or handler to call.
     */
    onTurn(context: TurnContext, next: () => Promise<void>): Promise<void>;
    /**
     * Logs an activity to the transcript.
     * @param transcript The transcript array to log the activity to.
     * @param activity The activity to log.
     */
    private logActivity;
    /**
     * Creates a deep copy of an activity.
     * @param activity The activity to clone.
     * @returns A deep copy of the activity.
     */
    private cloneActivity;
    /**
     * Handles errors that occur during logging.
     * @param err The error that occurred.
     */
    private transcriptLoggerErrorHandler;
}
