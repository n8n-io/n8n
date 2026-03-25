import { isStorageError, StorageError, StorageUnknownError } from '../lib/errors'
import { Fetch, get, head, post, remove } from '../lib/fetch'
import { recursiveToCamel, resolveFetch } from '../lib/helpers'
import {
  FileObject,
  FileOptions,
  SearchOptions,
  FetchParameters,
  TransformOptions,
  DestinationOptions,
  FileObjectV2,
  Camelize,
} from '../lib/types'

const DEFAULT_SEARCH_OPTIONS = {
  limit: 100,
  offset: 0,
  sortBy: {
    column: 'name',
    order: 'asc',
  },
}

const DEFAULT_FILE_OPTIONS: FileOptions = {
  cacheControl: '3600',
  contentType: 'text/plain;charset=UTF-8',
  upsert: false,
}

type FileBody =
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | Buffer
  | File
  | FormData
  | NodeJS.ReadableStream
  | ReadableStream<Uint8Array>
  | URLSearchParams
  | string

export default class StorageFileApi {
  protected url: string
  protected headers: { [key: string]: string }
  protected bucketId?: string
  protected fetch: Fetch

  constructor(
    url: string,
    headers: { [key: string]: string } = {},
    bucketId?: string,
    fetch?: Fetch
  ) {
    this.url = url
    this.headers = headers
    this.bucketId = bucketId
    this.fetch = resolveFetch(fetch)
  }

  /**
   * Uploads a file to an existing bucket or replaces an existing file at the specified path with a new one.
   *
   * @param method HTTP method.
   * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
   * @param fileBody The body of the file to be stored in the bucket.
   */
  private async uploadOrUpdate(
    method: 'POST' | 'PUT',
    path: string,
    fileBody: FileBody,
    fileOptions?: FileOptions
  ): Promise<
    | {
        data: { id: string; path: string; fullPath: string }
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    try {
      let body
      const options = { ...DEFAULT_FILE_OPTIONS, ...fileOptions }
      let headers: Record<string, string> = {
        ...this.headers,
        ...(method === 'POST' && { 'x-upsert': String(options.upsert as boolean) }),
      }

      const metadata = options.metadata

      if (typeof Blob !== 'undefined' && fileBody instanceof Blob) {
        body = new FormData()
        body.append('cacheControl', options.cacheControl as string)
        if (metadata) {
          body.append('metadata', this.encodeMetadata(metadata))
        }
        body.append('', fileBody)
      } else if (typeof FormData !== 'undefined' && fileBody instanceof FormData) {
        body = fileBody
        body.append('cacheControl', options.cacheControl as string)
        if (metadata) {
          body.append('metadata', this.encodeMetadata(metadata))
        }
      } else {
        body = fileBody
        headers['cache-control'] = `max-age=${options.cacheControl}`
        headers['content-type'] = options.contentType as string

        if (metadata) {
          headers['x-metadata'] = this.toBase64(this.encodeMetadata(metadata))
        }
      }

      if (fileOptions?.headers) {
        headers = { ...headers, ...fileOptions.headers }
      }

      const cleanPath = this._removeEmptyFolders(path)
      const _path = this._getFinalPath(cleanPath)
      const res = await this.fetch(`${this.url}/object/${_path}`, {
        method,
        body: body as BodyInit,
        headers,
        ...(options?.duplex ? { duplex: options.duplex } : {}),
      })

      const data = await res.json()

      if (res.ok) {
        return {
          data: { path: cleanPath, id: data.Id, fullPath: data.Key },
          error: null,
        }
      } else {
        const error = data
        return { data: null, error }
      }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Uploads a file to an existing bucket.
   *
   * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
   * @param fileBody The body of the file to be stored in the bucket.
   */
  async upload(
    path: string,
    fileBody: FileBody,
    fileOptions?: FileOptions
  ): Promise<
    | {
        data: { id: string; path: string; fullPath: string }
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    return this.uploadOrUpdate('POST', path, fileBody, fileOptions)
  }

  /**
   * Upload a file with a token generated from `createSignedUploadUrl`.
   * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
   * @param token The token generated from `createSignedUploadUrl`
   * @param fileBody The body of the file to be stored in the bucket.
   */
  async uploadToSignedUrl(
    path: string,
    token: string,
    fileBody: FileBody,
    fileOptions?: FileOptions
  ) {
    const cleanPath = this._removeEmptyFolders(path)
    const _path = this._getFinalPath(cleanPath)

    const url = new URL(this.url + `/object/upload/sign/${_path}`)
    url.searchParams.set('token', token)

    try {
      let body
      const options = { upsert: DEFAULT_FILE_OPTIONS.upsert, ...fileOptions }
      const headers: Record<string, string> = {
        ...this.headers,
        ...{ 'x-upsert': String(options.upsert as boolean) },
      }

      if (typeof Blob !== 'undefined' && fileBody instanceof Blob) {
        body = new FormData()
        body.append('cacheControl', options.cacheControl as string)
        body.append('', fileBody)
      } else if (typeof FormData !== 'undefined' && fileBody instanceof FormData) {
        body = fileBody
        body.append('cacheControl', options.cacheControl as string)
      } else {
        body = fileBody
        headers['cache-control'] = `max-age=${options.cacheControl}`
        headers['content-type'] = options.contentType as string
      }

      const res = await this.fetch(url.toString(), {
        method: 'PUT',
        body: body as BodyInit,
        headers,
      })

      const data = await res.json()

      if (res.ok) {
        return {
          data: { path: cleanPath, fullPath: data.Key },
          error: null,
        }
      } else {
        const error = data
        return { data: null, error }
      }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Creates a signed upload URL.
   * Signed upload URLs can be used to upload files to the bucket without further authentication.
   * They are valid for 2 hours.
   * @param path The file path, including the current file name. For example `folder/image.png`.
   * @param options.upsert If set to true, allows the file to be overwritten if it already exists.
   */
  async createSignedUploadUrl(
    path: string,
    options?: { upsert: boolean }
  ): Promise<
    | {
        data: { signedUrl: string; token: string; path: string }
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    try {
      let _path = this._getFinalPath(path)

      const headers = { ...this.headers }

      if (options?.upsert) {
        headers['x-upsert'] = 'true'
      }

      const data = await post(
        this.fetch,
        `${this.url}/object/upload/sign/${_path}`,
        {},
        { headers }
      )

      const url = new URL(this.url + data.url)

      const token = url.searchParams.get('token')

      if (!token) {
        throw new StorageError('No token returned by API')
      }

      return { data: { signedUrl: url.toString(), path, token }, error: null }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Replaces an existing file at the specified path with a new one.
   *
   * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to update.
   * @param fileBody The body of the file to be stored in the bucket.
   */
  async update(
    path: string,
    fileBody:
      | ArrayBuffer
      | ArrayBufferView
      | Blob
      | Buffer
      | File
      | FormData
      | NodeJS.ReadableStream
      | ReadableStream<Uint8Array>
      | URLSearchParams
      | string,
    fileOptions?: FileOptions
  ): Promise<
    | {
        data: { id: string; path: string; fullPath: string }
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    return this.uploadOrUpdate('PUT', path, fileBody, fileOptions)
  }

  /**
   * Moves an existing file to a new path in the same bucket.
   *
   * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
   * @param toPath The new file path, including the new file name. For example `folder/image-new.png`.
   * @param options The destination options.
   */
  async move(
    fromPath: string,
    toPath: string,
    options?: DestinationOptions
  ): Promise<
    | {
        data: { message: string }
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    try {
      const data = await post(
        this.fetch,
        `${this.url}/object/move`,
        {
          bucketId: this.bucketId,
          sourceKey: fromPath,
          destinationKey: toPath,
          destinationBucket: options?.destinationBucket,
        },
        { headers: this.headers }
      )
      return { data, error: null }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Copies an existing file to a new path in the same bucket.
   *
   * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
   * @param toPath The new file path, including the new file name. For example `folder/image-copy.png`.
   * @param options The destination options.
   */
  async copy(
    fromPath: string,
    toPath: string,
    options?: DestinationOptions
  ): Promise<
    | {
        data: { path: string }
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    try {
      const data = await post(
        this.fetch,
        `${this.url}/object/copy`,
        {
          bucketId: this.bucketId,
          sourceKey: fromPath,
          destinationKey: toPath,
          destinationBucket: options?.destinationBucket,
        },
        { headers: this.headers }
      )
      return { data: { path: data.Key }, error: null }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Creates a signed URL. Use a signed URL to share a file for a fixed amount of time.
   *
   * @param path The file path, including the current file name. For example `folder/image.png`.
   * @param expiresIn The number of seconds until the signed URL expires. For example, `60` for a URL which is valid for one minute.
   * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
   * @param options.transform Transform the asset before serving it to the client.
   */
  async createSignedUrl(
    path: string,
    expiresIn: number,
    options?: { download?: string | boolean; transform?: TransformOptions }
  ): Promise<
    | {
        data: { signedUrl: string }
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    try {
      let _path = this._getFinalPath(path)

      let data = await post(
        this.fetch,
        `${this.url}/object/sign/${_path}`,
        { expiresIn, ...(options?.transform ? { transform: options.transform } : {}) },
        { headers: this.headers }
      )
      const downloadQueryParam = options?.download
        ? `&download=${options.download === true ? '' : options.download}`
        : ''
      const signedUrl = encodeURI(`${this.url}${data.signedURL}${downloadQueryParam}`)
      data = { signedUrl }
      return { data, error: null }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Creates multiple signed URLs. Use a signed URL to share a file for a fixed amount of time.
   *
   * @param paths The file paths to be downloaded, including the current file names. For example `['folder/image.png', 'folder2/image2.png']`.
   * @param expiresIn The number of seconds until the signed URLs expire. For example, `60` for URLs which are valid for one minute.
   * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
   */
  async createSignedUrls(
    paths: string[],
    expiresIn: number,
    options?: { download: string | boolean }
  ): Promise<
    | {
        data: { error: string | null; path: string | null; signedUrl: string }[]
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    try {
      const data = await post(
        this.fetch,
        `${this.url}/object/sign/${this.bucketId}`,
        { expiresIn, paths },
        { headers: this.headers }
      )

      const downloadQueryParam = options?.download
        ? `&download=${options.download === true ? '' : options.download}`
        : ''
      return {
        data: data.map((datum: { signedURL: string }) => ({
          ...datum,
          signedUrl: datum.signedURL
            ? encodeURI(`${this.url}${datum.signedURL}${downloadQueryParam}`)
            : null,
        })),
        error: null,
      }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Downloads a file from a private bucket. For public buckets, make a request to the URL returned from `getPublicUrl` instead.
   *
   * @param path The full path and file name of the file to be downloaded. For example `folder/image.png`.
   * @param options.transform Transform the asset before serving it to the client.
   */
  async download(
    path: string,
    options?: { transform?: TransformOptions }
  ): Promise<
    | {
        data: Blob
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    const wantsTransformation = typeof options?.transform !== 'undefined'
    const renderPath = wantsTransformation ? 'render/image/authenticated' : 'object'
    const transformationQuery = this.transformOptsToQueryString(options?.transform || {})
    const queryString = transformationQuery ? `?${transformationQuery}` : ''

    try {
      const _path = this._getFinalPath(path)
      const res = await get(this.fetch, `${this.url}/${renderPath}/${_path}${queryString}`, {
        headers: this.headers,
        noResolveJson: true,
      })
      const data = await res.blob()
      return { data, error: null }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Retrieves the details of an existing file.
   * @param path
   */
  async info(
    path: string
  ): Promise<
    | {
        data: Camelize<FileObjectV2>
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    const _path = this._getFinalPath(path)

    try {
      const data = await get(this.fetch, `${this.url}/object/info/${_path}`, {
        headers: this.headers,
      })

      return { data: recursiveToCamel(data) as Camelize<FileObjectV2>, error: null }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Checks the existence of a file.
   * @param path
   */
  async exists(
    path: string
  ): Promise<
    | {
        data: boolean
        error: null
      }
    | {
        data: boolean
        error: StorageError
      }
  > {
    const _path = this._getFinalPath(path)

    try {
      await head(this.fetch, `${this.url}/object/${_path}`, {
        headers: this.headers,
      })

      return { data: true, error: null }
    } catch (error) {
      if (isStorageError(error) && error instanceof StorageUnknownError) {
        const originalError = (error.originalError as unknown) as { status: number }

        if ([400, 404].includes(originalError?.status)) {
          return { data: false, error }
        }
      }

      throw error
    }
  }

  /**
   * A simple convenience function to get the URL for an asset in a public bucket. If you do not want to use this function, you can construct the public URL by concatenating the bucket URL with the path to the asset.
   * This function does not verify if the bucket is public. If a public URL is created for a bucket which is not public, you will not be able to download the asset.
   *
   * @param path The path and name of the file to generate the public URL for. For example `folder/image.png`.
   * @param options.download Triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
   * @param options.transform Transform the asset before serving it to the client.
   */
  getPublicUrl(
    path: string,
    options?: { download?: string | boolean; transform?: TransformOptions }
  ): { data: { publicUrl: string } } {
    const _path = this._getFinalPath(path)
    const _queryString = []

    const downloadQueryParam = options?.download
      ? `download=${options.download === true ? '' : options.download}`
      : ''

    if (downloadQueryParam !== '') {
      _queryString.push(downloadQueryParam)
    }

    const wantsTransformation = typeof options?.transform !== 'undefined'
    const renderPath = wantsTransformation ? 'render/image' : 'object'
    const transformationQuery = this.transformOptsToQueryString(options?.transform || {})

    if (transformationQuery !== '') {
      _queryString.push(transformationQuery)
    }

    let queryString = _queryString.join('&')
    if (queryString !== '') {
      queryString = `?${queryString}`
    }

    return {
      data: { publicUrl: encodeURI(`${this.url}/${renderPath}/public/${_path}${queryString}`) },
    }
  }

  /**
   * Deletes files within the same bucket
   *
   * @param paths An array of files to delete, including the path and file name. For example [`'folder/image.png'`].
   */
  async remove(
    paths: string[]
  ): Promise<
    | {
        data: FileObject[]
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    try {
      const data = await remove(
        this.fetch,
        `${this.url}/object/${this.bucketId}`,
        { prefixes: paths },
        { headers: this.headers }
      )
      return { data, error: null }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Get file metadata
   * @param id the file id to retrieve metadata
   */
  // async getMetadata(
  //   id: string
  // ): Promise<
  //   | {
  //       data: Metadata
  //       error: null
  //     }
  //   | {
  //       data: null
  //       error: StorageError
  //     }
  // > {
  //   try {
  //     const data = await get(this.fetch, `${this.url}/metadata/${id}`, { headers: this.headers })
  //     return { data, error: null }
  //   } catch (error) {
  //     if (isStorageError(error)) {
  //       return { data: null, error }
  //     }

  //     throw error
  //   }
  // }

  /**
   * Update file metadata
   * @param id the file id to update metadata
   * @param meta the new file metadata
   */
  // async updateMetadata(
  //   id: string,
  //   meta: Metadata
  // ): Promise<
  //   | {
  //       data: Metadata
  //       error: null
  //     }
  //   | {
  //       data: null
  //       error: StorageError
  //     }
  // > {
  //   try {
  //     const data = await post(
  //       this.fetch,
  //       `${this.url}/metadata/${id}`,
  //       { ...meta },
  //       { headers: this.headers }
  //     )
  //     return { data, error: null }
  //   } catch (error) {
  //     if (isStorageError(error)) {
  //       return { data: null, error }
  //     }

  //     throw error
  //   }
  // }

  /**
   * Lists all the files within a bucket.
   * @param path The folder path.
   */
  async list(
    path?: string,
    options?: SearchOptions,
    parameters?: FetchParameters
  ): Promise<
    | {
        data: FileObject[]
        error: null
      }
    | {
        data: null
        error: StorageError
      }
  > {
    try {
      const body = { ...DEFAULT_SEARCH_OPTIONS, ...options, prefix: path || '' }
      const data = await post(
        this.fetch,
        `${this.url}/object/list/${this.bucketId}`,
        body,
        { headers: this.headers },
        parameters
      )
      return { data, error: null }
    } catch (error) {
      if (isStorageError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  protected encodeMetadata(metadata: Record<string, any>) {
    return JSON.stringify(metadata)
  }

  toBase64(data: string) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(data).toString('base64')
    }
    return btoa(data)
  }

  private _getFinalPath(path: string) {
    return `${this.bucketId}/${path}`
  }

  private _removeEmptyFolders(path: string) {
    return path.replace(/^\/|\/$/g, '').replace(/\/+/g, '/')
  }

  private transformOptsToQueryString(transform: TransformOptions) {
    const params = []
    if (transform.width) {
      params.push(`width=${transform.width}`)
    }

    if (transform.height) {
      params.push(`height=${transform.height}`)
    }

    if (transform.resize) {
      params.push(`resize=${transform.resize}`)
    }

    if (transform.format) {
      params.push(`format=${transform.format}`)
    }

    if (transform.quality) {
      params.push(`quality=${transform.quality}`)
    }

    return params.join('&')
  }
}
