import { red, yellow } from 'colorette';

import { ReuniteApi, PushPayload, ReuniteApiError } from '../api-client';

const originalFetch = global.fetch;

beforeAll(() => {
  // Reset fetch mock before each test
  global.fetch = jest.fn();
});

afterAll(() => {
  // Restore original fetch after each test
  global.fetch = originalFetch;
});

function mockFetchResponse(response: any) {
  (global.fetch as jest.Mock).mockResolvedValue(response);
}

describe('ApiClient', () => {
  const testToken = 'test-token';
  const testDomain = 'test-domain.com';
  const testOrg = 'test-org';
  const testProject = 'test-project';
  const version = '1.0.0';
  const command = 'push';
  const expectedUserAgent = `redocly-cli/${version} ${command}`;

  describe('getDefaultBranch()', () => {
    let apiClient: ReuniteApi;

    beforeEach(() => {
      apiClient = new ReuniteApi({ domain: testDomain, apiKey: testToken, version, command });
    });

    it('should get default project branch', async () => {
      mockFetchResponse({
        ok: true,
        json: jest.fn().mockResolvedValue({
          branchName: 'test-branch',
        }),
      });

      const result = await apiClient.remotes.getDefaultBranch(testOrg, testProject);

      expect(global.fetch).toHaveBeenCalledWith(
        `${testDomain}/api/orgs/${testOrg}/projects/${testProject}/source`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testToken}`,
            'user-agent': expectedUserAgent,
          },
          signal: expect.any(Object),
        }
      );

      expect(result).toEqual('test-branch');
    });

    it('should throw parsed error if response is not ok', async () => {
      mockFetchResponse({
        ok: false,
        json: jest.fn().mockResolvedValue({
          type: 'about:blank',
          title: 'Project source not found',
          status: 404,
          detail: 'Not Found',
          object: 'problem',
        }),
      });

      await expect(apiClient.remotes.getDefaultBranch(testOrg, testProject)).rejects.toThrow(
        new ReuniteApiError('Failed to fetch default branch. Project source not found.', 404)
      );
    });

    it('should throw statusText error if response is not ok', async () => {
      mockFetchResponse({
        ok: false,
        statusText: 'Not found',
        json: jest.fn().mockResolvedValue({
          unknownField: 'unknown-error',
        }),
      });

      await expect(apiClient.remotes.getDefaultBranch(testOrg, testProject)).rejects.toThrow(
        new ReuniteApiError('Failed to fetch default branch. Not found.', 404)
      );
    });
  });

  describe('upsert()', () => {
    const remotePayload = {
      mountBranchName: 'remote-mount-branch-name',
      mountPath: 'remote-mount-path',
    };

    const responseMock = {
      id: 'remote-id',
      type: 'CICD',
      mountPath: 'remote-mount-path',
      mountBranchName: 'remote-mount-branch-name',
      organizationId: testOrg,
      projectId: testProject,
    };

    let apiClient: ReuniteApi;

    beforeEach(() => {
      apiClient = new ReuniteApi({ domain: testDomain, apiKey: testToken, version, command });
    });

    it('should upsert remote', async () => {
      mockFetchResponse({
        ok: true,
        json: jest.fn().mockResolvedValue(responseMock),
      });

      const result = await apiClient.remotes.upsert(testOrg, testProject, remotePayload);

      expect(global.fetch).toHaveBeenCalledWith(
        `${testDomain}/api/orgs/${testOrg}/projects/${testProject}/remotes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testToken}`,
            'user-agent': expectedUserAgent,
          },
          body: JSON.stringify({
            mountPath: remotePayload.mountPath,
            mountBranchName: remotePayload.mountBranchName,
            type: 'CICD',
            autoMerge: true,
          }),
          signal: expect.any(Object),
          agent: undefined,
        }
      );

      expect(result).toEqual(responseMock);
    });

    it('should throw parsed error if response is not ok', async () => {
      mockFetchResponse({
        ok: false,
        json: jest.fn().mockResolvedValue({
          type: 'about:blank',
          title: 'Not allowed to mount remote outside of project content path: /docs',
          status: 403,
          detail: 'Forbidden',
          object: 'problem',
        }),
      });

      await expect(apiClient.remotes.upsert(testOrg, testProject, remotePayload)).rejects.toThrow(
        new ReuniteApiError(
          'Failed to upsert remote. Not allowed to mount remote outside of project content path: /docs.',
          403
        )
      );
    });

    it('should throw statusText error if response is not ok', async () => {
      mockFetchResponse({
        ok: false,
        status: 404,
        statusText: 'Not found',
        json: jest.fn().mockResolvedValue({
          unknownField: 'unknown-error',
        }),
      });

      await expect(apiClient.remotes.upsert(testOrg, testProject, remotePayload)).rejects.toThrow(
        new ReuniteApiError('Failed to upsert remote. Not found.', 404)
      );
    });
  });

  describe('push()', () => {
    const testRemoteId = 'test-remote-id';
    const pushPayload = {
      remoteId: testRemoteId,
      commit: {
        message: 'test-message',
        author: {
          name: 'test-name',
          email: 'test-email',
        },
        branchName: 'test-branch-name',
      },
    } as unknown as PushPayload;

    const filesMock = [{ path: 'some-file.yaml', stream: Buffer.from('fefef') }];

    const responseMock = {
      branchName: 'rem/cicd/rem_01he7sr6ys2agb7w0g9t7978fn-main',
      hasChanges: true,
      files: [
        {
          type: 'file',
          name: 'some-file.yaml',
          path: 'docs/remotes/some-file.yaml',
          lastModified: 1698925132394.2993,
          mimeType: 'text/yaml',
        },
      ],
      commitSha: 'bb23a2f8e012ac0b7b9961b57fb40d8686b21b43',
      outdated: false,
    };

    let apiClient: ReuniteApi;

    beforeEach(() => {
      apiClient = new ReuniteApi({ domain: testDomain, apiKey: testToken, version, command });
    });

    it('should push to remote', async () => {
      let passedFormData: FormData = new FormData();

      (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(
        async (_: any, options: any): Promise<Response> => {
          passedFormData = options.body as FormData;
          return {
            ok: true,
            json: jest.fn().mockResolvedValue(responseMock),
          } as unknown as Response;
        }
      );

      const formData = new globalThis.FormData();

      formData.append('remoteId', testRemoteId);
      formData.append('commit[message]', pushPayload.commit.message);
      formData.append('commit[author][name]', pushPayload.commit.author.name);
      formData.append('commit[author][email]', pushPayload.commit.author.email);
      formData.append('commit[branchName]', pushPayload.commit.branchName);
      formData.append('files[some-file.yaml]', new Blob([filesMock[0].stream]));

      const result = await apiClient.remotes.push(testOrg, testProject, pushPayload, filesMock);

      expect(fetch).toHaveBeenCalledWith(
        `${testDomain}/api/orgs/${testOrg}/projects/${testProject}/pushes`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${testToken}`,
            'user-agent': expectedUserAgent,
          },
        })
      );
      expect(passedFormData).toEqual(formData);
      expect(result).toEqual(responseMock);
    });

    it('should throw parsed error if response is not ok', async () => {
      mockFetchResponse({
        ok: false,
        json: jest.fn().mockResolvedValue({
          type: 'about:blank',
          title: 'Cannot push to remote',
          status: 403,
          detail: 'Forbidden',
          object: 'problem',
        }),
      });

      await expect(
        apiClient.remotes.push(testOrg, testProject, pushPayload, filesMock)
      ).rejects.toThrow(new ReuniteApiError('Failed to push. Cannot push to remote.', 403));
    });

    it('should throw statusText error if response is not ok', async () => {
      mockFetchResponse({
        ok: false,
        status: 404,
        statusText: 'Not found',
        json: jest.fn().mockResolvedValue({
          unknownField: 'unknown-error',
        }),
      });

      await expect(
        apiClient.remotes.push(testOrg, testProject, pushPayload, filesMock)
      ).rejects.toThrow(new ReuniteApiError('Failed to push. Not found.', 404));
    });
  });

  describe('Sunset header', () => {
    const upsertRemoteMock = {
      requestFn: () =>
        apiClient.remotes.upsert(testOrg, testProject, {
          mountBranchName: 'remote-mount-branch-name',
          mountPath: 'remote-mount-path',
        }),
      responseBody: {
        id: 'remote-id',
        type: 'CICD',
        mountPath: 'remote-mount-path',
        mountBranchName: 'remote-mount-branch-name',
        organizationId: testOrg,
        projectId: testProject,
      },
    };

    const getDefaultBranchMock = {
      requestFn: () => apiClient.remotes.getDefaultBranch(testOrg, testProject),
      responseBody: {
        branchName: 'test-branch',
      },
    };

    const pushMock = {
      requestFn: () =>
        apiClient.remotes.push(
          testOrg,
          testProject,
          {
            remoteId: 'test-remote-id',
            commit: {
              message: 'test-message',
              author: {
                name: 'test-name',
                email: 'test-email',
              },
              branchName: 'test-branch-name',
            },
          },
          [{ path: 'some-file.yaml', stream: Buffer.from('text content') }]
        ),
      responseBody: {
        branchName: 'rem/cicd/rem_01he7sr6ys2agb7w0g9t7978fn-main',
        hasChanges: true,
        files: [
          {
            type: 'file',
            name: 'some-file.yaml',
            path: 'docs/remotes/some-file.yaml',
            lastModified: 1698925132394.2993,
            mimeType: 'text/yaml',
          },
        ],
        commitSha: 'bb23a2f8e012ac0b7b9961b57fb40d8686b21b43',
        outdated: false,
      },
    };

    const endpointMocks = [upsertRemoteMock, getDefaultBranchMock, pushMock];

    let apiClient: ReuniteApi;

    beforeEach(() => {
      apiClient = new ReuniteApi({ domain: testDomain, apiKey: testToken, version, command });
    });

    it.each(endpointMocks)(
      'should report endpoint sunset in the past',
      async ({ responseBody, requestFn }) => {
        jest.spyOn(process.stdout, 'write').mockImplementationOnce(() => true);
        const sunsetDate = new Date('2024-09-06T12:30:32.456Z');

        mockFetchResponse({
          ok: true,
          json: jest.fn().mockResolvedValue(responseBody),
          headers: new Headers({
            Sunset: sunsetDate.toISOString(),
          }),
        });

        await requestFn();
        apiClient.reportSunsetWarnings();

        expect(process.stdout.write).toHaveBeenCalledWith(
          red(
            `The "push" command is not compatible with your version of Redocly CLI. Update to the latest version by running "npm install @redocly/cli@latest".\n\n`
          )
        );
      }
    );

    it.each(endpointMocks)(
      'should report endpoint sunset in the future',
      async ({ responseBody, requestFn }) => {
        jest.spyOn(process.stdout, 'write').mockImplementationOnce(() => true);
        const sunsetDate = new Date(Date.now() + 1000 * 60 * 60 * 24);

        mockFetchResponse({
          ok: true,
          json: jest.fn().mockResolvedValue(responseBody),
          headers: new Headers({
            Sunset: sunsetDate.toISOString(),
          }),
        });

        await requestFn();
        apiClient.reportSunsetWarnings();

        expect(process.stdout.write).toHaveBeenCalledWith(
          yellow(
            `The "push" command will be incompatible with your version of Redocly CLI after ${sunsetDate.toLocaleString()}. Update to the latest version by running "npm install @redocly/cli@latest".\n\n`
          )
        );
      }
    );

    it('should report only expired resource', async () => {
      jest.spyOn(process.stdout, 'write').mockImplementationOnce(() => true);

      mockFetchResponse({
        ok: true,
        json: jest.fn().mockResolvedValue(upsertRemoteMock.responseBody),
        headers: new Headers({
          Sunset: new Date('2024-08-06T12:30:32.456Z').toISOString(),
        }),
      });

      await upsertRemoteMock.requestFn();

      mockFetchResponse({
        ok: true,
        json: jest.fn().mockResolvedValue(getDefaultBranchMock.responseBody),
        headers: new Headers({
          Sunset: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        }),
      });

      await getDefaultBranchMock.requestFn();

      mockFetchResponse({
        ok: true,
        json: jest.fn().mockResolvedValue(pushMock.responseBody),
        headers: new Headers({
          Sunset: new Date('2024-08-06T12:30:32.456Z').toISOString(),
        }),
      });

      await pushMock.requestFn();

      apiClient.reportSunsetWarnings();

      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      expect(process.stdout.write).toHaveBeenCalledWith(
        red(
          `The "push" command is not compatible with your version of Redocly CLI. Update to the latest version by running "npm install @redocly/cli@latest".\n\n`
        )
      );
    });
  });
});
