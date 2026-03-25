import { yellow, red } from 'colorette';
import fetchWithTimeout, {
  type FetchWithTimeoutOptions,
  DEFAULT_FETCH_TIMEOUT,
} from '../../utils/fetch-with-timeout';

import type { ReadStream } from 'fs';
import type { Readable } from 'node:stream';
import type {
  ListRemotesResponse,
  ProjectSourceResponse,
  PushResponse,
  UpsertRemoteResponse,
} from './types';

interface BaseApiClient {
  request(url: string, options: FetchWithTimeoutOptions): Promise<Response>;
}
type CommandOption = 'push' | 'push-status';
export type SunsetWarning = { sunsetDate: Date; isSunsetExpired: boolean };
export type SunsetWarningsBuffer = SunsetWarning[];

export class ReuniteApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

class ReuniteApiClient implements BaseApiClient {
  public sunsetWarnings: SunsetWarningsBuffer = [];

  constructor(protected version: string, protected command: string) {}

  public async request(url: string, options: FetchWithTimeoutOptions) {
    const headers = {
      ...options.headers,
      'user-agent': `redocly-cli/${this.version.trim()} ${this.command}`,
    };

    const response = await fetchWithTimeout(url, {
      ...options,
      headers,
    });

    this.collectSunsetWarning(response);

    return response;
  }

  private collectSunsetWarning(response: Response) {
    const sunsetTime = this.getSunsetDate(response);

    if (!sunsetTime) return;

    const sunsetDate = new Date(sunsetTime);

    if (sunsetTime > Date.now()) {
      this.sunsetWarnings.push({
        sunsetDate,
        isSunsetExpired: false,
      });
    } else {
      this.sunsetWarnings.push({
        sunsetDate,
        isSunsetExpired: true,
      });
    }
  }

  private getSunsetDate(response: Response): number | undefined {
    const { headers } = response;

    if (!headers) {
      return;
    }

    const sunsetDate = headers.get('sunset') || headers.get('Sunset');

    if (!sunsetDate) {
      return;
    }

    return Date.parse(sunsetDate);
  }
}

class RemotesApi {
  constructor(
    private client: BaseApiClient,
    private readonly domain: string,
    private readonly apiKey: string
  ) {}

  protected async getParsedResponse<T>(response: Response): Promise<T> {
    const responseBody = await response.json();

    if (response.ok) {
      return responseBody as T;
    }

    throw new ReuniteApiError(
      `${responseBody.title || response.statusText || 'Unknown error'}.`,
      response.status
    );
  }

  async getDefaultBranch(organizationId: string, projectId: string) {
    try {
      const response = await this.client.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/source`,
        {
          timeout: DEFAULT_FETCH_TIMEOUT,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const source = await this.getParsedResponse<ProjectSourceResponse>(response);

      return source.branchName;
    } catch (err) {
      const message = `Failed to fetch default branch. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
    }
  }

  async upsert(
    organizationId: string,
    projectId: string,
    remote: {
      mountPath: string;
      mountBranchName: string;
    }
  ): Promise<UpsertRemoteResponse> {
    try {
      const response = await this.client.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes`,
        {
          timeout: DEFAULT_FETCH_TIMEOUT,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            mountPath: remote.mountPath,
            mountBranchName: remote.mountBranchName,
            type: 'CICD',
            autoMerge: true,
          }),
        }
      );

      return await this.getParsedResponse<UpsertRemoteResponse>(response);
    } catch (err) {
      const message = `Failed to upsert remote. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
    }
  }

  async push(
    organizationId: string,
    projectId: string,
    payload: PushPayload,
    files: { path: string; stream: ReadStream | Buffer }[]
  ): Promise<PushResponse> {
    const formData = new globalThis.FormData();

    formData.append('remoteId', payload.remoteId);
    formData.append('commit[message]', payload.commit.message);
    formData.append('commit[author][name]', payload.commit.author.name);
    formData.append('commit[author][email]', payload.commit.author.email);
    formData.append('commit[branchName]', payload.commit.branchName);
    payload.commit.url && formData.append('commit[url]', payload.commit.url);
    payload.commit.namespace && formData.append('commit[namespaceId]', payload.commit.namespace);
    payload.commit.sha && formData.append('commit[sha]', payload.commit.sha);
    payload.commit.repository && formData.append('commit[repositoryId]', payload.commit.repository);
    payload.commit.createdAt && formData.append('commit[createdAt]', payload.commit.createdAt);

    for (const file of files) {
      const blob = Buffer.isBuffer(file.stream)
        ? new Blob([file.stream])
        : new Blob([await streamToBuffer(file.stream)]);
      formData.append(`files[${file.path}]`, blob, file.path);
    }

    payload.isMainBranch && formData.append('isMainBranch', 'true');
    try {
      const response = await this.client.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/pushes`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: formData,
        }
      );

      return await this.getParsedResponse<PushResponse>(response);
    } catch (err) {
      const message = `Failed to push. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
    }
  }

  async getRemotesList({
    organizationId,
    projectId,
    mountPath,
  }: {
    organizationId: string;
    projectId: string;
    mountPath: string;
  }) {
    try {
      const response = await this.client.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes?filter=mountPath:/${mountPath}/`,
        {
          timeout: DEFAULT_FETCH_TIMEOUT,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return await this.getParsedResponse<ListRemotesResponse>(response);
    } catch (err) {
      const message = `Failed to get remote list. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
    }
  }

  async getPush({
    organizationId,
    projectId,
    pushId,
  }: {
    organizationId: string;
    projectId: string;
    pushId: string;
  }) {
    try {
      const response = await this.client.request(
        `${this.domain}/api/orgs/${organizationId}/projects/${projectId}/pushes/${pushId}`,
        {
          timeout: DEFAULT_FETCH_TIMEOUT,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return await this.getParsedResponse<PushResponse>(response);
    } catch (err) {
      const message = `Failed to get push status. ${err.message}`;

      if (err instanceof ReuniteApiError) {
        throw new ReuniteApiError(message, err.status);
      }

      throw new Error(message);
    }
  }
}

export class ReuniteApi {
  private apiClient: ReuniteApiClient;
  private version: string;
  private command: CommandOption;

  public remotes: RemotesApi;

  constructor({
    domain,
    apiKey,
    version,
    command,
  }: {
    domain: string;
    apiKey: string;
    version: string;
    command: CommandOption;
  }) {
    this.command = command;
    this.version = version;
    this.apiClient = new ReuniteApiClient(this.version, this.command);

    this.remotes = new RemotesApi(this.apiClient, domain, apiKey);
  }

  public reportSunsetWarnings(): void {
    const sunsetWarnings = this.apiClient.sunsetWarnings;

    if (sunsetWarnings.length) {
      const [{ isSunsetExpired, sunsetDate }] = sunsetWarnings.sort(
        (a: SunsetWarning, b: SunsetWarning) => {
          // First, prioritize by expiration status
          if (a.isSunsetExpired !== b.isSunsetExpired) {
            return a.isSunsetExpired ? -1 : 1;
          }

          // If both are either expired or not, sort by sunset date
          return a.sunsetDate > b.sunsetDate ? 1 : -1;
        }
      );

      const updateVersionMessage = `Update to the latest version by running "npm install @redocly/cli@latest".`;

      if (isSunsetExpired) {
        process.stdout.write(
          red(
            `The "${this.command}" command is not compatible with your version of Redocly CLI. ${updateVersionMessage}\n\n`
          )
        );
      } else {
        process.stdout.write(
          yellow(
            `The "${
              this.command
            }" command will be incompatible with your version of Redocly CLI after ${sunsetDate.toLocaleString()}. ${updateVersionMessage}\n\n`
          )
        );
      }
    }
  }
}

export type PushPayload = {
  remoteId: string;
  commit: {
    message: string;
    branchName: string;
    sha?: string;
    url?: string;
    createdAt?: string;
    namespace?: string;
    repository?: string;
    author: {
      name: string;
      email: string;
      image?: string;
    };
  };
  isMainBranch?: boolean;
};

export async function streamToBuffer(stream: ReadStream | Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
