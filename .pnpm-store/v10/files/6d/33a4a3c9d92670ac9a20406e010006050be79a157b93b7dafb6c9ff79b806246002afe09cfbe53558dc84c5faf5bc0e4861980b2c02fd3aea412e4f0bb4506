import { Activity } from '@microsoft/agents-activity'
import { PagedResult, TranscriptInfo, TranscriptLogger } from './transcriptLogger'

/**
 * Interface for storing and managing transcripts.
 */
export interface TranscriptStore extends TranscriptLogger {
  /**
   * Retrieves activities from a transcript.
   * @param channelId - The ID of the channel.
   * @param conversationId - The ID of the conversation.
   * @param continuationToken - Optional. The continuation token for pagination.
   * @param startDate - Optional. The start date to filter activities.
   * @returns A promise that resolves to a paged result of activities.
   */
  getTranscriptActivities(
    channelId: string,
    conversationId: string,
    continuationToken?: string,
    startDate?: Date,
  ): Promise<PagedResult<Activity>>;

  /**
   * Lists transcripts for a channel.
   * @param channelId - The ID of the channel.
   * @param continuationToken - Optional. The continuation token for pagination.
   * @returns A promise that resolves to a paged result of transcript information.
   */
  listTranscripts(channelId: string, continuationToken?: string): Promise<PagedResult<TranscriptInfo>>;

  /**
   * Deletes a transcript.
   * @param channelId - The ID of the channel.
   * @param conversationId - The ID of the conversation.
   * @returns A promise that resolves when the transcript is deleted.
   */
  deleteTranscript(channelId: string, conversationId: string): Promise<void>;
}
