import { AbortableAsyncIterator } from './utils.js'

import fs, { promises } from 'node:fs'
import { resolve } from 'node:path'
import { Ollama as OllamaBrowser } from './browser.js'

import type { CreateRequest, ProgressResponse } from './interfaces.js'

export class Ollama extends OllamaBrowser {
  async encodeImage(image: Uint8Array | Buffer | string): Promise<string> {
    if (typeof image !== 'string') {
      // image is Uint8Array or Buffer, convert it to base64
      return Buffer.from(image).toString('base64')
    }
    try {
      if (fs.existsSync(image)) {
        // this is a filepath, read the file and convert it to base64
        const fileBuffer = await promises.readFile(resolve(image))
        return Buffer.from(fileBuffer).toString('base64')
      }
    } catch {
      // continue
    }
    // the string may be base64 encoded
    return image
  }

  /**
   * checks if a file exists
   * @param path {string} - The path to the file
   * @private @internal
   * @returns {Promise<boolean>} - Whether the file exists or not
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await promises.access(path)
      return true
    } catch {
      return false
    }
  }

  create(
    request: CreateRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<ProgressResponse>>
  create(request: CreateRequest & { stream?: false }): Promise<ProgressResponse>

  async create(
    request: CreateRequest,
  ): Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>> {
    // fail if request.from is a local path
    // TODO: https://github.com/ollama/ollama-js/issues/191
    if (request.from && await this.fileExists(resolve(request.from))) {
      throw Error('Creating with a local path is not currently supported from ollama-js')
    }

    if (request.stream) {
      return super.create(request as CreateRequest & { stream: true })
    } else {
      return super.create(request as CreateRequest & { stream: false })
    }
  }
}

export default new Ollama()

// export all types from the main entry point so that packages importing types dont need to specify paths
export * from './interfaces.js'

export type { AbortableAsyncIterator }
