import { Activity } from '@microsoft/agents-activity'

/**
 * Interface for logging activities to a transcript.
 */
export interface TranscriptLogger {
  /**
   * Logs an activity.
   * @param activity - The activity to log.
   */
  logActivity(activity: Activity): void | Promise<void>;
}

/**
 * Information about a transcript.
 */
export interface TranscriptInfo {
  /**
   * The ID of the channel.
   */
  channelId: string;
  /**
   * The ID of the transcript.
   */
  id: string;
  /**
   * The creation date of the transcript.
   */
  created: Date;
}

/**
 * Paged result of items.
 * @typeParam T - The type of items in the paged result.
 */
export interface PagedResult<T> {
  /**
   * The items in the paged result.
   */
  items: T[];
  /**
   * The continuation token for pagination.
   */
  continuationToken?: string;
}
