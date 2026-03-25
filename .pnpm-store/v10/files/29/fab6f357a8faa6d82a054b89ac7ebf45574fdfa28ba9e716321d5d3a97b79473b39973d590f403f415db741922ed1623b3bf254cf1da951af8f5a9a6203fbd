import { getProxyAgent, isNotEmptyObject } from '../utils';
import { getRedoclyDomain } from './domains';

import type {
  NotFoundProblemResponse,
  PrepareFileuploadOKResponse,
  PrepareFileuploadParams,
  PushApiParams,
} from './registry-api-types';
import type { AccessTokens, Region } from '../config/types';

const version = require('../../package.json').version;

export class RegistryApi {
  constructor(private accessTokens: AccessTokens, private region: Region) {}

  get accessToken() {
    return isNotEmptyObject(this.accessTokens) && this.accessTokens[this.region];
  }

  getBaseUrl() {
    return `https://api.${getRedoclyDomain()}/registry`;
  }

  setAccessTokens(accessTokens: AccessTokens) {
    this.accessTokens = accessTokens;
    return this;
  }

  private async request(path = '', options: RequestInit = {}) {
    const currentCommand =
      typeof process !== 'undefined' ? process.env?.REDOCLY_CLI_COMMAND || '' : '';
    const redoclyEnv = typeof process !== 'undefined' ? process.env?.REDOCLY_ENVIRONMENT || '' : '';

    const headers = Object.assign({}, options.headers || {}, {
      'x-redocly-cli-version': version,
      'user-agent': `redocly-cli / ${version} ${currentCommand} ${redoclyEnv}`,
    });

    if (!headers.hasOwnProperty('authorization')) {
      throw new Error('Unauthorized');
    }

    const requestOptions = {
      ...options,
      headers,
      agent: getProxyAgent(),
    };

    const response = await fetch(`${this.getBaseUrl()}${path}`, requestOptions);

    if (response.status === 401) {
      throw new Error('Unauthorized');
    }

    if (response.status === 404) {
      const body: NotFoundProblemResponse = await response.json();
      throw new Error(body.code);
    }

    return response;
  }

  async authStatus(
    accessToken: string,
    verbose = false
  ): Promise<{ viewerId: string; organizations: string[] }> {
    try {
      const response = await this.request('', { headers: { authorization: accessToken } });

      return await response.json();
    } catch (error) {
      if (verbose) {
        console.log(error);
      }

      throw error;
    }
  }

  async prepareFileUpload({
    organizationId,
    name,
    version,
    filesHash,
    filename,
    isUpsert,
  }: PrepareFileuploadParams): Promise<PrepareFileuploadOKResponse> {
    const response = await this.request(
      `/${organizationId}/${name}/${version}/prepare-file-upload`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: this.accessToken,
        } as HeadersInit,
        body: JSON.stringify({
          filesHash,
          filename,
          isUpsert,
        }),
      }
    );

    if (response.ok) {
      return response.json();
    }

    throw new Error('Could not prepare file upload');
  }

  async pushApi({
    organizationId,
    name,
    version,
    rootFilePath,
    filePaths,
    branch,
    isUpsert,
    isPublic,
    batchId,
    batchSize,
  }: PushApiParams) {
    const response = await this.request(`/${organizationId}/${name}/${version}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: this.accessToken,
      } as HeadersInit,
      body: JSON.stringify({
        rootFilePath,
        filePaths,
        branch,
        isUpsert,
        isPublic,
        batchId,
        batchSize,
      }),
    });

    if (response.ok) {
      return;
    }

    throw new Error('Could not push api');
  }
}
