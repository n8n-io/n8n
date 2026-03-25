import { TurnContext } from '../turnContext'
import { ResourceResponse } from '../connector-client'
import { Middleware } from '../middlewareSet'
import { TranscriptLogger } from './transcriptLogger'
import { Activity, ActivityEventNames, ActivityTypes, ConversationReference, RoleTypes } from '@microsoft/agents-activity'
import { debug } from '@microsoft/agents-activity/logger'

const appLogger = debug('agents:rest-client')

/**
 * Middleware for logging agent conversations to a transcript logger.
 */
export class TranscriptLoggerMiddleware implements Middleware {
  private logger: TranscriptLogger

  /**
   * Creates a new instance of the TranscriptLoggerMiddleware class.
   * @param logger The transcript logger to use.
   * @throws Will throw an error if the logger is not provided.
   */
  constructor (logger: TranscriptLogger) {
    if (!logger) {
      throw new Error('TranscriptLoggerMiddleware requires a TranscriptLogger instance.')
    }

    this.logger = logger
  }

  /**
   * Called each time the agent processes a turn.
   * @param context The context object for the turn.
   * @param next The next middleware or handler to call.
   */
  async onTurn (context: TurnContext, next: () => Promise<void>): Promise<void> {
    const transcript: Activity[] = []
    if (context.activity && context.activity.from) {
      if (!context.activity.from.role) {
        context.activity.from.role = RoleTypes.User
      }

      this.logActivity(transcript, this.cloneActivity(context.activity))
    }

    context.onSendActivities(
      async (ctx: TurnContext, activities: Partial<Activity>[], next: () => Promise<ResourceResponse[]>) => {
        const responses = await next()

        activities.forEach((activity, index) => {
          const clonedActivity = this.cloneActivity(activity)
          clonedActivity.id = responses && responses[index] ? responses[index].id : clonedActivity.id

          if (!clonedActivity.id) {
            const prefix = `g_${Math.random().toString(36).slice(2, 8)}`
            if (clonedActivity.timestamp) {
              clonedActivity.id = `${prefix}${new Date(clonedActivity.timestamp).getTime().toString()}`
            } else {
              clonedActivity.id = `${prefix}${new Date().getTime().toString()}`
            }
          }

          this.logActivity(transcript, clonedActivity)
        })

        return responses
      }
    )

    context.onUpdateActivity(async (ctx: TurnContext, activity: Partial<Activity>, next: () => Promise<void>) => {
      const response: void = await next()

      const updateActivity = this.cloneActivity(activity)
      updateActivity.type = ActivityTypes.MessageUpdate
      this.logActivity(transcript, updateActivity)

      return response
    })

    context.onDeleteActivity(
      async (ctx: TurnContext, reference: Partial<ConversationReference>, next: () => Promise<void>) => {
        await next()

        // const deleteActivity = TurnContext.applyConversationReference(
        //     {
        //         type: ActivityTypes.MessageDelete,
        //         id: reference.activityId,
        //     },
        //     reference,
        //     false,
        // );

        // this.logActivity(transcript, this.cloneActivity(deleteActivity));
      }
    )

    await next()

    while (transcript.length) {
      try {
        const activity = transcript.shift()
        if (activity) {
          const maybePromise = this.logger.logActivity(activity)

          if (maybePromise instanceof Promise) {
            maybePromise.catch((err) => {
              this.transcriptLoggerErrorHandler(err)
            })
          }
        }
      } catch (err) {
        this.transcriptLoggerErrorHandler(err)
      }
    }
  }

  /**
   * Logs an activity to the transcript.
   * @param transcript The transcript array to log the activity to.
   * @param activity The activity to log.
   */
  private logActivity (transcript: Activity[], activity: Activity): void {
    if (!activity.timestamp) {
      activity.timestamp = new Date()
    }

    if (!(activity.type === ActivityTypes.Event && activity.name === ActivityEventNames.ContinueConversation)) {
      transcript.push(activity)
    }
  }

  /**
   * Creates a deep copy of an activity.
   * @param activity The activity to clone.
   * @returns A deep copy of the activity.
   */
  private cloneActivity (activity: Partial<Activity>): Activity {
    return Object.assign(<Activity>{}, activity)
  }

  /**
   * Handles errors that occur during logging.
   * @param err The error that occurred.
   */
  private transcriptLoggerErrorHandler (err: Error | any): void {
    if (err instanceof Error) {
      appLogger.error(`TranscriptLoggerMiddleware logActivity failed: "${err.message}"`)
      appLogger.error(JSON.stringify(err.stack))
    } else {
      appLogger.error(`TranscriptLoggerMiddleware logActivity failed: "${JSON.stringify(err)}"`)
    }
  }
}
