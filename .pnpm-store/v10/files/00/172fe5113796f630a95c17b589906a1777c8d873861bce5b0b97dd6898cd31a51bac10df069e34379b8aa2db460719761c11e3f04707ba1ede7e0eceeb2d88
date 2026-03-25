/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Attachment, Channels } from '@microsoft/agents-activity'
import { debug } from '@microsoft/agents-activity/logger'
import { ConnectorClient } from '../connector-client'
import { InputFile, InputFileDownloader } from './inputFileDownloader'
import { TurnContext } from '../turnContext'
import { TurnState } from './turnState'
import axios, { AxiosInstance } from 'axios'
import { z } from 'zod'

const logger = debug('agents:teamsAttachmentDownloader')

/**
 * Downloads attachments from Teams using the bots access token.
 */
export class TeamsAttachmentDownloader<TState extends TurnState = TurnState> implements InputFileDownloader<TState> {
  private _httpClient: AxiosInstance
  private _stateKey: string

  public constructor (stateKey: string = 'inputFiles') {
    this._httpClient = axios.create()
    this._stateKey = stateKey
  }

  /**
   * Download any files relative to the current user's input.
   *
   * @param {TurnContext} context Context for the current turn of conversation.
   * @returns {Promise<InputFile[]>} Promise that resolves to an array of downloaded input files.
   */
  public async downloadFiles (context: TurnContext): Promise<InputFile[]> {
    if (context.activity.channelId !== Channels.Msteams && context.activity.channelId !== Channels.M365Copilot) {
      return Promise.resolve([])
    }
    // Filter out HTML attachments
    const attachments = context.activity.attachments?.filter((a) => a.contentType && !a.contentType.startsWith('text/html'))
    if (!attachments || attachments.length === 0) {
      return Promise.resolve([])
    }

    const connectorClient : ConnectorClient = context.turnState.get<ConnectorClient>(context.adapter.ConnectorClientKey)
    this._httpClient.defaults.headers = connectorClient.axiosInstance.defaults.headers

    const files: InputFile[] = []
    for (const attachment of attachments) {
      const file = await this.downloadFile(attachment)
      if (file) {
        files.push(file)
      }
    }

    return files
  }

  /**
   * @private
   * @param {Attachment} attachment - Attachment to download.
   * @returns {Promise<InputFile>} - Promise that resolves to the downloaded input file.
   */
  private async downloadFile (attachment: Attachment): Promise<InputFile | undefined> {
    let inputFile: InputFile | undefined

    if (attachment.contentUrl && attachment.contentUrl.startsWith('https://')) {
      try {
        const contentSchema = z.object({ downloadUrl: z.string().url() })
        const parsed = contentSchema.safeParse(attachment.content)
        const downloadUrl = parsed.success ? parsed.data.downloadUrl : attachment.contentUrl
        const response = await this._httpClient.get(downloadUrl, { responseType: 'arraybuffer' })

        const content = Buffer.from(response.data, 'binary')
        const contentType = response.headers['content-type'] || 'application/octet-stream'
        inputFile = { content, contentType, contentUrl: attachment.contentUrl }
      } catch (error) {
        logger.error(`Failed to download Teams attachment: ${error}`)
        return undefined
      }
    } else {
      if (!attachment.content) {
        logger.error('Attachment missing content')
        return undefined
      }
      if (!(attachment.content instanceof ArrayBuffer) && !Buffer.isBuffer(attachment.content)) {
        logger.error('Attachment content is not ArrayBuffer or Buffer')
        return undefined
      }
      inputFile = {
        content: Buffer.from(attachment.content as ArrayBuffer),
        contentType: attachment.contentType,
        contentUrl: attachment.contentUrl
      }
    }
    return inputFile
  }

  /**
   * Downloads files from the attachments in the current turn context and stores them in state.
   *
   * @param context The turn context containing the activity with attachments.
   * @param state The turn state to store the files in.
   * @returns A promise that resolves when the downloaded files are stored.
   */
  public async downloadAndStoreFiles (context: TurnContext, state: TState): Promise<void> {
    const files = await this.downloadFiles(context)
    state.setValue(this._stateKey, files)
  }
}
