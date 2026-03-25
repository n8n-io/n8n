/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { debug } from '@microsoft/agents-activity/logger'
import { PagedResult, TranscriptInfo } from './transcriptLogger'
import { TranscriptStore } from './transcriptStore'
import * as fs from 'fs/promises'
import * as path from 'path'
import { EOL } from 'os'
import { Activity, ActivityTypes } from '@microsoft/agents-activity'

const logger = debug('agents:file-transcript-logger')

/**
 * FileTranscriptLogger which creates a .transcript file for each conversationId.
 * @remarks
 * This is a useful class for unit tests.
 *
 * Concurrency Safety:
 * - Uses an in-memory promise chain to serialize writes within the same Node.js process
 * - Prevents race conditions and file corruption when multiple concurrent writes occur
 * - Optimized for performance with minimal overhead (no file-based locking)
 *
 * Note: This implementation is designed for single-process scenarios. For multi-server
 * deployments, consider using a database-backed transcript store.
 */
export class FileTranscriptLogger implements TranscriptStore {
  private static readonly TRANSCRIPT_FILE_EXTENSION = '.transcript'
  private static readonly MAX_FILE_NAME_SIZE = 100
  private readonly _folder: string
  private readonly _fileLocks: Map<string, Promise<any>> = new Map()

  /**
   * Initializes a new instance of the FileTranscriptLogger class.
   * @param folder - Folder to place the transcript files (Default current directory).
   */
  constructor (folder?: string) {
    this._folder = path.normalize(folder ?? process.cwd())
  }

  /**
   * Log an activity to the transcript.
   * @param activity - The activity to transcribe.
   * @returns A promise that represents the work queued to execute.
   */
  async logActivity (activity: Activity): Promise<void> {
    if (!activity) {
      throw new Error('activity is required.')
    }

    const transcriptFile = this.getTranscriptFile(activity.channelId!, activity.conversation?.id!)

    if (activity.type === ActivityTypes.Message) {
      const sender = activity.from?.name ?? activity.from?.id ?? activity.from?.role
      logger.debug(`${sender} [${activity.type}] ${activity.text}`)
    } else {
      const sender = activity.from?.name ?? activity.from?.id ?? activity.from?.role
      logger.debug(`${sender} [${activity.type}]`)
    }

    await this.withFileLock(transcriptFile, async () => {
      const maxRetries = 3
      for (let i = 1; i <= maxRetries; i++) {
        try {
          switch (activity.type) {
            case ActivityTypes.MessageDelete:
              return await this.messageDeleteAsync(activity, transcriptFile)

            case ActivityTypes.MessageUpdate:
              return await this.messageUpdateAsync(activity, transcriptFile)

            default: // Append activity
              return await this.logActivityToFile(activity, transcriptFile)
          }
        } catch (error) {
          // Try again
          logger.warn(`Try ${i} - Failed to log activity because:`, error)
          if (i === maxRetries) {
            throw error
          }
        }
      }
    })
  }

  /**
   * Gets from the store activities that match a set of criteria.
   * @param channelId - The ID of the channel the conversation is in.
   * @param conversationId - The ID of the conversation.
   * @param continuationToken - The continuation token (if available).
   * @param startDate - A cutoff date. Activities older than this date are not included.
   * @returns A promise that resolves with the matching activities.
   */
  async getTranscriptActivities (
    channelId: string,
    conversationId: string,
    continuationToken?: string,
    startDate?: Date
  ): Promise<PagedResult<Activity>> {
    const transcriptFile = this.getTranscriptFile(channelId, conversationId)
    if (!await this.pathExists(transcriptFile)) {
      logger.debug(`Transcript file does not exist: ${this.protocol(transcriptFile)}`)
      return { items: [], continuationToken: undefined }
    }

    const transcript = await this.loadTranscriptAsync(transcriptFile)
    const filterDate = startDate ?? new Date(0)
    const items = transcript.filter(activity => {
      const activityDate = activity.timestamp ? new Date(activity.timestamp) : new Date(0)
      return activityDate >= filterDate
    })

    return { items, continuationToken: undefined }
  }

  /**
   * Gets the conversations on a channel from the store.
   * @param channelId - The ID of the channel.
   * @param continuationToken - Continuation token (if available).
   * @returns A promise that resolves with all transcripts for the given ChannelID.
   */
  async listTranscripts (channelId: string, continuationToken?: string): Promise<PagedResult<TranscriptInfo>> {
    const channelFolder = this.getChannelFolder(channelId)
    if (!await this.pathExists(channelFolder)) {
      logger.debug(`Channel folder does not exist: ${this.protocol(channelFolder)}`)
      return { items: [], continuationToken: undefined }
    }

    const files = await fs.readdir(channelFolder)
    const items: TranscriptInfo[] = []
    for (const file of files) {
      if (!file.endsWith('.transcript')) {
        continue
      }

      const filePath = path.join(channelFolder, file)
      const stats = await fs.stat(filePath)

      items.push({
        channelId,
        id: path.parse(file).name,
        created: stats.birthtime
      })
    }

    return { items, continuationToken: undefined }
  }

  /**
   * Deletes conversation data from the store.
   * @param channelId - The ID of the channel the conversation is in.
   * @param conversationId - The ID of the conversation to delete.
   * @returns A promise that represents the work queued to execute.
   */
  async deleteTranscript (channelId: string, conversationId: string): Promise<void> {
    const file = this.getTranscriptFile(channelId, conversationId)
    await this.withFileLock(file, async () => {
      if (!await this.pathExists(file)) {
        logger.debug(`Transcript file does not exist: ${this.protocol(file)}`)
        return
      }
      await fs.unlink(file)
    })
  }

  /**
   * Loads a transcript from a file.
   */
  private async loadTranscriptAsync (transcriptFile: string): Promise<Activity[]> {
    if (!await this.pathExists(transcriptFile)) {
      return []
    }

    const json = await fs.readFile(transcriptFile, 'utf-8')
    const result = JSON.parse(json)
    return result.map(Activity.fromObject)
  }

  /**
   * Executes a file operation with exclusive locking per file.
   * This ensures that concurrent writes to the same transcript file are serialized.
   */
  private async withFileLock<T> (transcriptFile: string, operation: () => Promise<T>): Promise<T> {
    // Get the current lock chain for this file
    const existingLock = this._fileLocks.get(transcriptFile) ?? Promise.resolve()

    // Create a new lock that waits for the existing one and then performs the operation
    const newLock = existingLock.then(async () => {
      return await operation()
    }).catch(error => {
      logger.warn('Error in write chain:', error)
      throw error
    })

    // Update the lock chain
    this._fileLocks.set(transcriptFile, newLock)

    // Wait for this operation to complete
    try {
      return await newLock
    } finally {
      // Clean up if this was the last operation in the chain
      if (this._fileLocks.get(transcriptFile) === newLock) {
        this._fileLocks.delete(transcriptFile)
      }
    }
  }

  /**
   * Performs the actual write operation to the transcript file.
   */
  private async logActivityToFile (activity: Activity, transcriptFile: string): Promise<void> {
    const activityStr = JSON.stringify(activity)

    if (!await this.pathExists(transcriptFile)) {
      const folder = path.dirname(transcriptFile)
      if (!await this.pathExists(folder)) {
        await fs.mkdir(folder, { recursive: true })
      }
      await fs.writeFile(transcriptFile, `[${activityStr}]`, 'utf-8')
      return
    }

    // Use file handle to append efficiently
    const fileHandle = await fs.open(transcriptFile, 'r+')
    try {
      const stats = await fileHandle.stat()

      // Seek to before the closing bracket
      const position = Math.max(0, stats.size - 1)

      // Write the comma, new activity, and closing bracket
      const appendContent = `,${EOL}${activityStr}]`
      await fileHandle.write(appendContent, position)
      // Truncate any remaining content (in case the file had trailing data)
      await fileHandle.truncate(position + Buffer.byteLength(appendContent))
    } finally {
      await fileHandle.close()
    }
  }

  /**
   * Updates a message in the transcript.
   */
  private async messageUpdateAsync (activity: Activity, transcriptFile: string): Promise<void> {
    // Load all activities
    const transcript = await this.loadTranscriptAsync(transcriptFile)

    for (let i = 0; i < transcript.length; i++) {
      const originalActivity = transcript[i]
      if (originalActivity.id === activity.id) {
        // Clone and update the activity
        const updatedActivity: Activity = { ...activity } as Activity
        updatedActivity.type = originalActivity.type // Fixup original type (should be Message)
        updatedActivity.localTimestamp = originalActivity.localTimestamp
        updatedActivity.timestamp = originalActivity.timestamp
        transcript[i] = updatedActivity

        const json = JSON.stringify(transcript)
        await fs.writeFile(transcriptFile, json, 'utf-8')
        return
      }
    }
  }

  /**
   * Deletes a message from the transcript (tombstones it).
   */
  private async messageDeleteAsync (activity: Activity, transcriptFile: string): Promise<void> {
    // Load all activities
    const transcript = await this.loadTranscriptAsync(transcriptFile)

    // If message delete comes in, tombstone the message in the transcript
    for (let index = 0; index < transcript.length; index++) {
      const originalActivity = transcript[index]
      if (originalActivity.id === activity.id) {
        // Tombstone the original message
        transcript[index] = {
          type: ActivityTypes.MessageDelete,
          id: originalActivity.id,
          from: {
            id: 'deleted',
            role: originalActivity.from?.role
          },
          recipient: {
            id: 'deleted',
            role: originalActivity.recipient?.role
          },
          locale: originalActivity.locale,
          localTimestamp: originalActivity.timestamp,
          timestamp: originalActivity.timestamp,
          channelId: originalActivity.channelId,
          conversation: originalActivity.conversation,
          serviceUrl: originalActivity.serviceUrl,
          replyToId: originalActivity.replyToId
        } as Activity

        const json = JSON.stringify(transcript)
        await fs.writeFile(transcriptFile, json, 'utf-8')
        return
      }
    }
  }

  /**
   * Sanitizes a string by removing invalid characters.
   */
  private static sanitizeString (str: string, invalidChars: string[]): string {
    if (!str?.trim()) {
      return str
    }

    // Preemptively check for : in string and replace with _
    let result = str.replaceAll(':', '_')

    // Remove invalid characters
    for (const invalidChar of invalidChars) {
      result = result.replaceAll(invalidChar, '')
    }

    return result
  }

  /**
   * Gets the transcript file path for a conversation.
   */
  private getTranscriptFile (channelId: string, conversationId: string): string {
    if (!channelId?.trim()) {
      throw new Error('channelId is required.')
    }

    if (!conversationId?.trim()) {
      throw new Error('conversationId is required.')
    }

    // Get invalid filename characters (cross-platform)
    const invalidChars = this.getInvalidFileNameChars()
    let fileName = FileTranscriptLogger.sanitizeString(conversationId, invalidChars)

    const maxLength = FileTranscriptLogger.MAX_FILE_NAME_SIZE - FileTranscriptLogger.TRANSCRIPT_FILE_EXTENSION.length
    if (fileName && fileName.length > maxLength) {
      fileName = fileName.substring(0, maxLength)
    }

    const channelFolder = this.getChannelFolder(channelId)
    return path.join(channelFolder, fileName + FileTranscriptLogger.TRANSCRIPT_FILE_EXTENSION)
  }

  /**
   * Gets the channel folder path, creating it if necessary.
   */
  private getChannelFolder (channelId: string): string {
    if (!channelId?.trim()) {
      throw new Error('channelId is required.')
    }

    const invalidChars = this.getInvalidPathChars()
    const folderName = FileTranscriptLogger.sanitizeString(channelId, invalidChars)
    return path.join(this._folder, folderName)
  }

  /**
   * Checks if a file or directory exists.
   */
  private async pathExists (path: string): Promise<boolean> {
    try {
      await fs.stat(path)
      return true
    } catch {
      return false
    }
  }

  /**
   * Gets invalid filename characters for the current platform.
   */
  private getInvalidFileNameChars (): string[] {
    // Windows invalid filename chars: < > : " / \ | ? *
    // Unix systems are more permissive, but / is always invalid
    const invalid = this.getInvalidPathChars()
    if (process.platform === 'win32') {
      return [...invalid, '/', '\\']
    } else {
      return [...invalid, '/']
    }
  }

  /**
   * Gets invalid path characters for the current platform.
   */
  private getInvalidPathChars (): string[] {
    // Similar to filename chars but allows directory separators in the middle
    if (process.platform === 'win32') {
      return ['<', '>', ':', '"', '|', '?', '*', '\0']
    } else {
    // Unix/Linux: only null byte is invalid in paths
      return ['\0']
    }
  }

  /**
   * Adds file:// protocol to a file path.
   */
  private protocol (filePath: string): string {
    return `file://${filePath.replace(/\\/g, '/')}`
  }
}
