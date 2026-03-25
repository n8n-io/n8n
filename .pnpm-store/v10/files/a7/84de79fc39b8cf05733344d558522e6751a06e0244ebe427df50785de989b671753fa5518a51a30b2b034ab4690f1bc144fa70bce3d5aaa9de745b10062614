"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptLoggerMiddleware = void 0;
const agents_activity_1 = require("@microsoft/agents-activity");
const logger_1 = require("@microsoft/agents-activity/logger");
const appLogger = (0, logger_1.debug)('agents:rest-client');
/**
 * Middleware for logging agent conversations to a transcript logger.
 */
class TranscriptLoggerMiddleware {
    /**
     * Creates a new instance of the TranscriptLoggerMiddleware class.
     * @param logger The transcript logger to use.
     * @throws Will throw an error if the logger is not provided.
     */
    constructor(logger) {
        if (!logger) {
            throw new Error('TranscriptLoggerMiddleware requires a TranscriptLogger instance.');
        }
        this.logger = logger;
    }
    /**
     * Called each time the agent processes a turn.
     * @param context The context object for the turn.
     * @param next The next middleware or handler to call.
     */
    async onTurn(context, next) {
        const transcript = [];
        if (context.activity && context.activity.from) {
            if (!context.activity.from.role) {
                context.activity.from.role = agents_activity_1.RoleTypes.User;
            }
            this.logActivity(transcript, this.cloneActivity(context.activity));
        }
        context.onSendActivities(async (ctx, activities, next) => {
            const responses = await next();
            activities.forEach((activity, index) => {
                const clonedActivity = this.cloneActivity(activity);
                clonedActivity.id = responses && responses[index] ? responses[index].id : clonedActivity.id;
                if (!clonedActivity.id) {
                    const prefix = `g_${Math.random().toString(36).slice(2, 8)}`;
                    if (clonedActivity.timestamp) {
                        clonedActivity.id = `${prefix}${new Date(clonedActivity.timestamp).getTime().toString()}`;
                    }
                    else {
                        clonedActivity.id = `${prefix}${new Date().getTime().toString()}`;
                    }
                }
                this.logActivity(transcript, clonedActivity);
            });
            return responses;
        });
        context.onUpdateActivity(async (ctx, activity, next) => {
            const response = await next();
            const updateActivity = this.cloneActivity(activity);
            updateActivity.type = agents_activity_1.ActivityTypes.MessageUpdate;
            this.logActivity(transcript, updateActivity);
            return response;
        });
        context.onDeleteActivity(async (ctx, reference, next) => {
            await next();
            // const deleteActivity = TurnContext.applyConversationReference(
            //     {
            //         type: ActivityTypes.MessageDelete,
            //         id: reference.activityId,
            //     },
            //     reference,
            //     false,
            // );
            // this.logActivity(transcript, this.cloneActivity(deleteActivity));
        });
        await next();
        while (transcript.length) {
            try {
                const activity = transcript.shift();
                if (activity) {
                    const maybePromise = this.logger.logActivity(activity);
                    if (maybePromise instanceof Promise) {
                        maybePromise.catch((err) => {
                            this.transcriptLoggerErrorHandler(err);
                        });
                    }
                }
            }
            catch (err) {
                this.transcriptLoggerErrorHandler(err);
            }
        }
    }
    /**
     * Logs an activity to the transcript.
     * @param transcript The transcript array to log the activity to.
     * @param activity The activity to log.
     */
    logActivity(transcript, activity) {
        if (!activity.timestamp) {
            activity.timestamp = new Date();
        }
        if (!(activity.type === agents_activity_1.ActivityTypes.Event && activity.name === agents_activity_1.ActivityEventNames.ContinueConversation)) {
            transcript.push(activity);
        }
    }
    /**
     * Creates a deep copy of an activity.
     * @param activity The activity to clone.
     * @returns A deep copy of the activity.
     */
    cloneActivity(activity) {
        return Object.assign({}, activity);
    }
    /**
     * Handles errors that occur during logging.
     * @param err The error that occurred.
     */
    transcriptLoggerErrorHandler(err) {
        if (err instanceof Error) {
            appLogger.error(`TranscriptLoggerMiddleware logActivity failed: "${err.message}"`);
            appLogger.error(JSON.stringify(err.stack));
        }
        else {
            appLogger.error(`TranscriptLoggerMiddleware logActivity failed: "${JSON.stringify(err)}"`);
        }
    }
}
exports.TranscriptLoggerMiddleware = TranscriptLoggerMiddleware;
//# sourceMappingURL=transcriptLoggerMiddleware.js.map