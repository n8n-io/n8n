import * as utils from './utils.js'
import { AbortableAsyncIterator, parseJSON } from './utils.js'
import 'whatwg-fetch'

import type {
  ChatRequest,
  ChatResponse,
  Config,
  CopyRequest,
  CreateRequest,
  DeleteRequest,
  EmbedRequest,
  EmbedResponse,
  EmbeddingsRequest,
  EmbeddingsResponse,
  ErrorResponse,
  Fetch,
  GenerateRequest,
  GenerateResponse,
  ListResponse,
  ProgressResponse,
  PullRequest,
  PushRequest,
  ShowRequest,
  ShowResponse,
  StatusResponse,
  WebSearchRequest,
  WebSearchResponse,
  WebFetchRequest,
  WebFetchResponse,
  VersionResponse,
} from './interfaces.js'
import { defaultHost } from './constant.js'

export class Ollama {
  protected readonly config: Config
  protected readonly fetch: Fetch
  protected readonly ongoingStreamedRequests: AbortableAsyncIterator<object>[] = []

  constructor(config?: Partial<Config>) {
    this.config = {
      host: '',
      headers: config?.headers
    }

    if (!config?.proxy) {
      this.config.host = utils.formatHost(config?.host ?? defaultHost)
    }

    this.fetch = config?.fetch ?? fetch
  }



  // Abort any ongoing streamed requests to Ollama
  public abort() {
    for (const request of this.ongoingStreamedRequests) {
      request.abort()
    }
    this.ongoingStreamedRequests.length = 0
  }

  /**
   * Processes a request to the Ollama server. If the request is streamable, it will return a
   * AbortableAsyncIterator that yields the response messages. Otherwise, it will return the response
   * object.
   * @param endpoint {string} - The endpoint to send the request to.
   * @param request {object} - The request object to send to the endpoint.
   * @protected {T | AbortableAsyncIterator<T>} - The response object or a AbortableAsyncIterator that yields
   * response messages.
   * @throws {Error} - If the response body is missing or if the response is an error.
   * @returns {Promise<T | AbortableAsyncIterator<T>>} - The response object or a AbortableAsyncIterator that yields the streamed response.
   */
  protected async processStreamableRequest<T extends object>(
    endpoint: string,
    request: { stream?: boolean } & Record<string, any>,
  ): Promise<T | AbortableAsyncIterator<T>> {
    request.stream = request.stream ?? false
    const host = `${this.config.host}/api/${endpoint}`
    if (request.stream) {
      const abortController = new AbortController()
      const response = await utils.post(this.fetch, host, request, {
        signal: abortController.signal,
        headers: this.config.headers
      })

      if (!response.body) {
        throw new Error('Missing body')
      }

      const itr = parseJSON<T | ErrorResponse>(response.body)
      const abortableAsyncIterator = new AbortableAsyncIterator(
        abortController,
        itr,
        () => {
          const i = this.ongoingStreamedRequests.indexOf(abortableAsyncIterator)
          if (i > -1) {
            this.ongoingStreamedRequests.splice(i, 1)
          }
        },
      )
      this.ongoingStreamedRequests.push(abortableAsyncIterator)
      return abortableAsyncIterator
    }
    const response = await utils.post(this.fetch, host, request, {
      headers: this.config.headers
    })
    return await response.json()
  }

/**
 * Encodes an image to base64 if it is a Uint8Array.
 * @param image {Uint8Array | string} - The image to encode.
 * @returns {Promise<string>} - The base64 encoded image.
 */
async encodeImage(image: Uint8Array | string): Promise<string> {
  if (typeof image !== 'string') {
    // image is Uint8Array, convert it to base64
    const uint8Array = new Uint8Array(image);
    let byteString = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      byteString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(byteString);
  }
  // the string may be base64 encoded
  return image;
}

  generate(
    request: GenerateRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<GenerateResponse>>
  generate(request: GenerateRequest & { stream?: false }): Promise<GenerateResponse>
  /**
   * Generates a response from a text prompt.
   * @param request {GenerateRequest} - The request object.
   * @returns {Promise<GenerateResponse | AbortableAsyncIterator<GenerateResponse>>} - The response object or
   * an AbortableAsyncIterator that yields response messages.
   */
  async generate(
    request: GenerateRequest,
  ): Promise<GenerateResponse | AbortableAsyncIterator<GenerateResponse>> {
    if (request.images) {
      request.images = await Promise.all(request.images.map(this.encodeImage.bind(this)))
    }
    return this.processStreamableRequest<GenerateResponse>('generate', request)
  }

  chat(
    request: ChatRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<ChatResponse>>
  chat(request: ChatRequest & { stream?: false }): Promise<ChatResponse>
  /**
   * Chats with the model. The request object can contain messages with images that are either
   * Uint8Arrays or base64 encoded strings. The images will be base64 encoded before sending the
   * request.
   * @param request {ChatRequest} - The request object.
   * @returns {Promise<ChatResponse | AbortableAsyncIterator<ChatResponse>>} - The response object or an
   * AbortableAsyncIterator that yields response messages.
   */
  async chat(
    request: ChatRequest,
  ): Promise<ChatResponse | AbortableAsyncIterator<ChatResponse>> {
    if (request.messages) {
      for (const message of request.messages) {
        if (message.images) {
          message.images = await Promise.all(
            message.images.map(this.encodeImage.bind(this)),
          )
        }
      }
    }
    return this.processStreamableRequest<ChatResponse>('chat', request)
  }

  create(
    request: CreateRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<ProgressResponse>>
  create(request: CreateRequest & { stream?: false }): Promise<ProgressResponse>
  /**
   * Creates a new model from a stream of data.
   * @param request {CreateRequest} - The request object.
   * @returns {Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>>} - The response object or a stream of progress responses.
   */
  async create(
    request: CreateRequest
  ): Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>> {
    return this.processStreamableRequest<ProgressResponse>('create', {
      ...request
    })
  }

  pull(
    request: PullRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<ProgressResponse>>
  pull(request: PullRequest & { stream?: false }): Promise<ProgressResponse>
  /**
   * Pulls a model from the Ollama registry. The request object can contain a stream flag to indicate if the
   * response should be streamed.
   * @param request {PullRequest} - The request object.
   * @returns {Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>>} - The response object or
   * an AbortableAsyncIterator that yields response messages.
   */
  async pull(
    request: PullRequest,
  ): Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>> {
    return this.processStreamableRequest<ProgressResponse>('pull', {
      name: request.model,
      stream: request.stream,
      insecure: request.insecure,
    })
  }

  push(
    request: PushRequest & { stream: true },
  ): Promise<AbortableAsyncIterator<ProgressResponse>>
  push(request: PushRequest & { stream?: false }): Promise<ProgressResponse>
  /**
   * Pushes a model to the Ollama registry. The request object can contain a stream flag to indicate if the
   * response should be streamed.
   * @param request {PushRequest} - The request object.
   * @returns {Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>>} - The response object or
   * an AbortableAsyncIterator that yields response messages.
   */
  async push(
    request: PushRequest,
  ): Promise<ProgressResponse | AbortableAsyncIterator<ProgressResponse>> {
    return this.processStreamableRequest<ProgressResponse>('push', {
      name: request.model,
      stream: request.stream,
      insecure: request.insecure,
    })
  }

  /**
   * Deletes a model from the server. The request object should contain the name of the model to
   * delete.
   * @param request {DeleteRequest} - The request object.
   * @returns {Promise<StatusResponse>} - The response object.
   */
  async delete(request: DeleteRequest): Promise<StatusResponse> {
    await utils.del(
      this.fetch,
      `${this.config.host}/api/delete`,
      { name: request.model },
      { headers: this.config.headers }
    )
    return { status: 'success' }
  }

  /**
   * Copies a model from one name to another. The request object should contain the name of the
   * model to copy and the new name.
   * @param request {CopyRequest} - The request object.
   * @returns {Promise<StatusResponse>} - The response object.
   */
  async copy(request: CopyRequest): Promise<StatusResponse> {
    await utils.post(this.fetch, `${this.config.host}/api/copy`, { ...request }, {
      headers: this.config.headers
    })
    return { status: 'success' }
  }

  /**
   * Lists the models on the server.
   * @returns {Promise<ListResponse>} - The response object.
   * @throws {Error} - If the response body is missing.
   */
  async list(): Promise<ListResponse> {
    const response = await utils.get(this.fetch, `${this.config.host}/api/tags`, {
      headers: this.config.headers
    })
    return (await response.json()) as ListResponse
  }

  /**
   * Shows the metadata of a model. The request object should contain the name of the model.
   * @param request {ShowRequest} - The request object.
   * @returns {Promise<ShowResponse>} - The response object.
   */
  async show(request: ShowRequest): Promise<ShowResponse> {
    const response = await utils.post(this.fetch, `${this.config.host}/api/show`, {
      ...request,
    }, {
      headers: this.config.headers
    })
    return (await response.json()) as ShowResponse
  }

  /**
   * Embeds text input into vectors.
   * @param request {EmbedRequest} - The request object.
   * @returns {Promise<EmbedResponse>} - The response object.
   */
    async embed(request: EmbedRequest): Promise<EmbedResponse> {
      const response = await utils.post(this.fetch, `${this.config.host}/api/embed`, {
        ...request,
      }, {
        headers: this.config.headers
      })
      return (await response.json()) as EmbedResponse
    }

  /**
   * Embeds a text prompt into a vector.
   * @param request {EmbeddingsRequest} - The request object.
   * @returns {Promise<EmbeddingsResponse>} - The response object.
   */
  async embeddings(request: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    const response = await utils.post(this.fetch, `${this.config.host}/api/embeddings`, {
      ...request,
    }, {
      headers: this.config.headers
    })
    return (await response.json()) as EmbeddingsResponse
  }

  /**
   * Lists the running models on the server
   * @returns {Promise<ListResponse>} - The response object.
   * @throws {Error} - If the response body is missing.
   */
  async ps(): Promise<ListResponse> {
    const response = await utils.get(this.fetch, `${this.config.host}/api/ps`, {
      headers: this.config.headers
    })
    return (await response.json()) as ListResponse
  }

  /**
   * Returns the Ollama server version.
   * @returns {Promise<VersionResponse>} - The server version object.
   */
  async version(): Promise<VersionResponse> {
    const response = await utils.get(this.fetch, `${this.config.host}/api/version`, {
      headers: this.config.headers,
    })
    return (await response.json()) as VersionResponse
  }

  /**
   * Performs web search using the Ollama web search API
   * @param request {WebSearchRequest} - The search request containing query and options
   * @returns {Promise<WebSearchResponse>} - The search results
   * @throws {Error} - If the request is invalid or the server returns an error
   */
  async webSearch(request: WebSearchRequest): Promise<WebSearchResponse> {
    if (!request.query || request.query.length === 0) {
      throw new Error('Query is required')
    }
    const response = await utils.post(this.fetch, `https://ollama.com/api/web_search`, { ...request }, {
      headers: this.config.headers
    })
    return (await response.json()) as WebSearchResponse
  }

  /**
   * Fetches a single page using the Ollama web fetch API
   * @param request {WebFetchRequest} - The fetch request containing a URL
   * @returns {Promise<WebFetchResponse>} - The fetch result
   * @throws {Error} - If the request is invalid or the server returns an error
   */
  async webFetch(request: WebFetchRequest): Promise<WebFetchResponse> {
    if (!request.url || request.url.length === 0) {
      throw new Error('URL is required')
    }
    const response = await utils.post(this.fetch, `https://ollama.com/api/web_fetch`, { ...request }, { headers: this.config.headers })
    return (await response.json()) as WebFetchResponse
  }
}

export default new Ollama()

// export all types from the main entry point so that packages importing types dont need to specify paths
export * from './interfaces.js'
