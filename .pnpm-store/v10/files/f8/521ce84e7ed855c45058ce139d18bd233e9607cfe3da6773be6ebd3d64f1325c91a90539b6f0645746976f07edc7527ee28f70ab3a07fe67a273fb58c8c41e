import { Activity } from '@microsoft/agents-activity'
import { TranscriptLogger } from './transcriptLogger'

/**
 * A transcript logger that logs activities to the console.
 */
export class ConsoleTranscriptLogger implements TranscriptLogger {
  /**
   * Logs an activity to the console.
   * @param activity The activity to log.
   * @throws Will throw an error if the activity is not provided.
   */
  logActivity (activity: Activity): void | Promise<void> {
    if (!activity) {
      throw new Error('Activity is required.')
    }

    console.log('Activity Log:', activity)
  }
}
