/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Activity, addAIToActivity, Attachment, Entity, ClientCitation, SensitivityUsageInfo, DeliveryModes, Channels } from '@microsoft/agents-activity'
import { TurnContext } from '../../turnContext'
import { Citation } from './citation'
import { CitationUtil } from './citationUtil'
import { debug } from '@microsoft/agents-activity/logger'

const logger = debug('agents:streamingResponse')

/**
 * Results for streaming response operations.
 */
export enum StreamingResponseResult {
  /**
   * The operation was successful.
   */
  Success = 'success',
  /**
   * The stream has already ended.
   */
  AlreadyEnded = 'alreadyEnded',
  /**
   * The user canceled the streaming response.
   */
  UserCanceled = 'userCanceled',
  /**
   * An error occurred during the streaming response.
   */
  Error = 'error'
}

/**
 * A helper class for streaming responses to the client.
 *
 * @remarks
 * This class is used to send a series of updates to the client in a single response. The expected
 * sequence of calls is:
 *
 * `queueInformativeUpdate()`, `queueTextChunk()`, `queueTextChunk()`, ..., `endStream()`.
 *
 * Once `endStream()` is called, the stream is considered ended and no further updates can be sent.
 */
export class StreamingResponse {
  private readonly _context: TurnContext
  private _nextSequence: number = 1
  private _streamId?: string
  private _message: string = ''
  private _attachments?: Attachment[]
  private _ended = false
  private _delayInMs = 250
  private _isStreamingChannel: boolean = true
  private _finalMessage?: Activity
  private _canceled = false
  private _userCanceled = false

  // Queue for outgoing activities
  private _queue: Array<() => Activity> = []
  private _queueSync: Promise<void> | undefined
  private _chunkQueued = false

  // Powered by AI feature flags
  private _enableFeedbackLoop = false
  private _feedbackLoopType?: 'default' | 'custom'
  private _enableGeneratedByAILabel = false
  private _citations?: ClientCitation[] = []
  private _sensitivityLabel?: SensitivityUsageInfo

  /**
   * Creates a new StreamingResponse instance.
   *
   * @param {TurnContext} context - Context for the current turn of conversation with the user.
   * @returns {TurnContext} - The context for the current turn of conversation with the user.
   */
  public constructor (context: TurnContext) {
    this._context = context
    this.loadDefaults(context.activity)
  }

  /**
   * Gets the stream ID of the current response.
   *
   * @returns {string | undefined} - The stream ID of the current response.
   *
   * @remarks
   * Assigned after the initial update is sent.
   */
  public get streamId (): string | undefined {
    return this._streamId
  }

  /**
     * Gets the citations of the current response.
     */
  public get citations (): ClientCitation[] | undefined {
    return this._citations
  }

  /**
   * Gets the number of updates sent for the stream.
   *
   * @returns {number} - The number of updates sent for the stream.
   */
  public get updatesSent (): number {
    return this._nextSequence - 1
  }

  /**
   * Gets the delay in milliseconds between chunks.
   * @remarks
   * Teams default: 1000 ms
   * Web Chat / Direct Line default: 500 ms
   * Other channels: 250 ms
   */
  public get delayInMs (): number {
    return this._delayInMs
  }

  /**
   * Gets whether the channel supports streaming.
   */
  public get isStreamingChannel (): boolean {
    return this._isStreamingChannel
  }

  /**
   * Queues an informative update to be sent to the client.
   *
   * @param {string} text Text of the update to send.
   */
  public queueInformativeUpdate (text: string): void {
    if (!this.isStreamingChannel || !text.trim() || this._canceled) {
      return
    }

    if (this._ended) {
      throw new Error('The stream has already ended.')
    }

    // Queue a typing activity
    this.queueActivity(() => Activity.fromObject({
      type: 'typing',
      text,
      entities: [{
        type: 'streaminfo',
        streamType: 'informative',
        streamSequence: this._nextSequence++
      }]
    }))
  }

  /**
   * Queues a chunk of partial message text to be sent to the client
   *
   * @param {string} text Partial text of the message to send.
   * @param {Citation[]} citations Citations to be included in the message.
   *
   * @remarks
   * The text we be sent as quickly as possible to the client. Chunks may be combined before
   * delivery to the client.
   *
   */
  public queueTextChunk (text: string, citations?: Citation[]): void {
    if (!text.trim() || this._canceled) {
      return
    }

    if (this._ended) {
      throw new Error('The stream has already ended.')
    }

    // Update full message text
    this._message += text

    // If there are citations, modify the content so that the sources are numbers instead of [doc1], [doc2], etc.
    this._message = CitationUtil.formatCitationsResponse(this._message)

    if (!this.isStreamingChannel) {
      return
    }

    // Queue the next chunk
    this.queueNextChunk()
  }

  /**
   * Ends the stream by sending the final message to the client.
   *
   * @returns {Promise<StreamingResponseResult>} - StreamingResponseResult with the result of the streaming response.
   */
  public async endStream (): Promise<StreamingResponseResult> {
    if (this._ended) {
      return StreamingResponseResult.AlreadyEnded
    }

    if (this._canceled) {
      return this._userCanceled ? StreamingResponseResult.UserCanceled : StreamingResponseResult.Error
    }

    // Queue final message
    this._ended = true

    if (!this.isStreamingChannel) {
      await this.sendActivity(this.createFinalMessage())
      return StreamingResponseResult.Success
    }

    // Queue final message
    this.queueNextChunk()

    // Wait for the queue to drain
    await this.waitForQueue()
    return StreamingResponseResult.Success
  }

  /**
   * Resets the streaming response to its initial state.
   * If the stream is still running, this will wait for completion.
   */
  public async reset () : Promise<void> {
    await this.waitForQueue()

    this._queueSync = undefined
    this._queue = []
    this._chunkQueued = false
    this._ended = false
    this._canceled = false
    this._userCanceled = false
    this._message = ''
    this._nextSequence = 1
    this._streamId = undefined
  }

  /**
   * Set Activity that will be (optionally) used for the final streaming message.
   */
  public setFinalMessage (activity: Activity): void {
    this._finalMessage = activity
  }

  /**
   * Sets the attachments to attach to the final chunk.
   *
   * @param attachments List of attachments.
   */
  public setAttachments (attachments: Attachment[]): void {
    this._attachments = attachments
  }

  /**
   * Sets the sensitivity label to attach to the final chunk.
   *
   * @param sensitivityLabel The sensitivty label.
   */
  public setSensitivityLabel (sensitivityLabel: SensitivityUsageInfo): void {
    this._sensitivityLabel = sensitivityLabel
  }

  /**
   * Sets the citations for the full message.
   *
   * @param {Citation[]} citations Citations to be included in the message.
   */
  public setCitations (citations: Citation[]): void {
    if (citations.length > 0) {
      if (!this._citations) {
        this._citations = []
      }
      let currPos = this._citations.length

      for (const citation of citations) {
        const clientCitation: ClientCitation = {
          '@type': 'Claim',
          position: currPos + 1,
          appearance: {
            '@type': 'DigitalDocument',
            name: citation.title || `Document #${currPos + 1}`,
            abstract: CitationUtil.snippet(citation.content, 477),
            url: citation.url!
          }
        }
        currPos++
        this._citations.push(clientCitation)
      }
    }
  }

  /**
   * Sets the Feedback Loop in Teams that allows a user to
   * give thumbs up or down to a response.
   * Default is `false`.
   *
   * @param enableFeedbackLoop If true, the feedback loop is enabled.
   */
  public setFeedbackLoop (enableFeedbackLoop: boolean): void {
    this._enableFeedbackLoop = enableFeedbackLoop
  }

  /**
   * Sets the type of UI to use for the feedback loop.
   *
   * @param feedbackLoopType The type of the feedback loop.
   */
  public setFeedbackLoopType (feedbackLoopType: 'default' | 'custom'): void {
    this._feedbackLoopType = feedbackLoopType
  }

  /**
   * Sets the the Generated by AI label in Teams
   * Default is `false`.
   *
   * @param enableGeneratedByAILabel If true, the label is added.
   */
  public setGeneratedByAILabel (enableGeneratedByAILabel: boolean): void {
    this._enableGeneratedByAILabel = enableGeneratedByAILabel
  }

  /**
   * Sets the delay in milliseconds between chunks.
   * @param delayInMs The delay in milliseconds.
   */
  public setDelayInMs (delayInMs: number): void {
    this._delayInMs = delayInMs
  }

  /**
   * Returns the most recently streamed message.
   *
   * @returns The streamed message.
   */
  public getMessage (): string {
    return this._message
  }

  /**
   * Waits for the outgoing activity queue to be empty.
   *
   * @returns {Promise<void>} - A promise representing the async operation.
   */
  private waitForQueue (): Promise<void> {
    return this._queueSync || Promise.resolve()
  }

  /**
   * Queues the next chunk of text to be sent to the client.
   *
   * @private
   */
  private queueNextChunk (): void {
    // Are we already waiting to send a chunk?
    if (this._chunkQueued) {
      return
    }

    // Queue a chunk of text to be sent
    this._chunkQueued = true
    this.queueActivity(() => {
      this._chunkQueued = false
      if (this._ended) {
        // Send final message
        return this.createFinalMessage()
      } else {
        // Send typing activity
        return Activity.fromObject({
          type: 'typing',
          text: this._message,
          entities: [{
            type: 'streaminfo',
            streamType: 'streaming',
            streamSequence: this._nextSequence++
          }]
        })
      }
    })
  }

  /**
   * Queues an activity to be sent to the client.
   */
  private queueActivity (factory: () => Activity): void {
    this._queue.push(factory)

    // If there's no sync in progress, start one
    if (!this._queueSync) {
      this._queueSync = this.drainQueue().catch((err) => {
        logger.error(`Error occurred when sending activity while streaming: "${JSON.stringify(err)}".`)
        // throw err
      })
    }
  }

  /**
   * Sends any queued activities to the client until the queue is empty.
   *
   * @returns {Promise<void>} - A promise that will be resolved once the queue is empty.
   * @private
   */
  private async drainQueue (): Promise<void> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<void>(async (resolve, reject) => {
      try {
        logger.debug(`Draining queue with ${this._queue.length} activities.`)
        while (this._queue.length > 0) {
          const factory = this._queue.shift()!
          const activity = factory()
          await this.sendActivity(activity)
        }

        resolve()
      } catch (err) {
        reject(err)
      } finally {
        this._queueSync = undefined
      }
    })
  }

  /**
   * Creates the final message to be sent at the end of the stream.
   */
  private createFinalMessage (): Activity {
    const activity = this._finalMessage ?? new Activity('message')
    activity.type = 'message'

    if (!this._finalMessage) {
      activity.text = this._message || 'end of stream response'
    }

    activity.entities ??= []
    activity.attachments = this._attachments
    this._nextSequence++ // Increment sequence for final message, even if not streaming.

    if (this.isStreamingChannel) {
      activity.entities.push({
        type: 'streaminfo',
        streamType: 'final',
        streamSequence: this._nextSequence
      })
    }

    return activity
  }

  /**
   * Sends an activity to the client and saves the stream ID returned.
   *
   * @param {Activity} activity - The activity to send.
   * @returns {Promise<void>} - A promise representing the async operation.
   * @private
   */
  private async sendActivity (activity: Activity): Promise<void> {
    // Set activity ID to the assigned stream ID
    if (this._streamId) {
      activity.id = this._streamId
      if (!activity.entities) {
        activity.entities = []
      }
      if (!activity.entities[0]) {
        activity.entities[0] = {} as Entity
      }
      activity.entities[0].streamId = this._streamId
    }

    if (this._citations && this._citations.length > 0 && !this._ended) {
      // Filter out the citations unused in content.
      const currCitations = CitationUtil.getUsedCitations(this._message, this._citations) ?? undefined
      activity.entities!.push({
        type: 'https://schema.org/Message',
        '@type': 'Message',
        '@context': 'https://schema.org',
        '@id': '',
        citation: currCitations
      } as unknown as Entity)
    }

    // Add in Powered by AI feature flags
    if (this._ended) {
      activity.channelData = {
        feedbackLoopEnabled: this._enableFeedbackLoop ?? false,
        ...(this._feedbackLoopType ? { type: this._feedbackLoopType } : {})
      }

      // Add in Generated by AI
      if (this._enableGeneratedByAILabel) {
        addAIToActivity(activity, this._citations, this._sensitivityLabel)
      }
    }

    try {
      const response = await this._context.sendActivity(activity)
      if (!this._streamId) {
        this._streamId = response?.id
      }
      await new Promise((resolve) => setTimeout(resolve, this.delayInMs))
    } catch (error) {
      const { message } = error as Error
      this._canceled = true
      this._queueSync = undefined
      this._queue = []

      // MS Teams code list: https://learn.microsoft.com/en-us/microsoftteams/platform/bots/streaming-ux?tabs=jsts#error-codes
      if (message.includes('ContentStreamNotAllowed')) {
        logger.warn('Streaming content is not allowed by the client side.', { originalError: message })
        this._userCanceled = true
      } else if (message.includes('BadArgument') && message.toLowerCase().includes('streaming api is not enabled')) {
        logger.warn('Interaction does not support streaming. Defaulting to non-streaming response.', { originalError: message })
        this._canceled = false
        this._isStreamingChannel = false
      }
    }
  }

  /**
   * Loads default values for the streaming response.
   */
  private loadDefaults (activity: Activity) {
    if (!activity) {
      return
    }

    if (activity.deliveryMode === DeliveryModes.ExpectReplies) {
      this._isStreamingChannel = false
    } else if (Channels.Msteams === activity.channelId) {
      if (activity.isAgenticRequest()) {
        // Agentic requests do not support streaming responses at this time.
        // TODO: Enable streaming for agentic requests when supported.
        this._isStreamingChannel = false
      } else {
        this._isStreamingChannel = true
        this._delayInMs = 1000
      }
    } else if (Channels.Webchat === activity.channelId || Channels.Directline === activity.channelId) {
      this._isStreamingChannel = true
      this._delayInMs = 500
    } else {
      this._isStreamingChannel = false
    }
  }
}
