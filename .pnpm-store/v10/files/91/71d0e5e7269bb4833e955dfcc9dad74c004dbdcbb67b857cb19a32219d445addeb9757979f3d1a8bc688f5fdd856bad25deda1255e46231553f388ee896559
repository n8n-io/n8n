import * as fs from 'fs';
import * as path from 'path';
import { handlePush } from '../push';
import { ReuniteApi, ReuniteApiError } from '../../api';

const remotes = {
  push: jest.fn(),
  upsert: jest.fn(),
  getDefaultBranch: jest.fn(),
};

jest.mock('@redocly/openapi-core', () => ({
  slash: jest.fn().mockImplementation((p) => p),
}));

jest.mock('../../api', () => ({
  ...jest.requireActual('../../api'),
  ReuniteApi: jest.fn().mockImplementation(function (this: any, ...args) {
    this.remotes = remotes;
    this.reportSunsetWarnings = jest.fn();
  }),
}));

describe('handlePush()', () => {
  let pathResolveSpy: jest.SpyInstance;
  let pathRelativeSpy: jest.SpyInstance;
  let pathDirnameSpy: jest.SpyInstance;
  let fsStatSyncSpy: jest.SpyInstance;
  let fsReaddirSyncSpy: jest.SpyInstance;

  beforeEach(() => {
    remotes.getDefaultBranch.mockResolvedValueOnce('test-default-branch');
    remotes.upsert.mockResolvedValueOnce({ id: 'test-remote-id', mountPath: 'test-mount-path' });
    remotes.push.mockResolvedValueOnce({ branchName: 'uploaded-to-branch', id: 'test-id' });

    jest.spyOn(fs, 'createReadStream').mockReturnValue('stream' as any);

    pathResolveSpy = jest.spyOn(path, 'resolve');
    pathRelativeSpy = jest.spyOn(path, 'relative');
    pathDirnameSpy = jest.spyOn(path, 'dirname');
    fsStatSyncSpy = jest.spyOn(fs, 'statSync');
    fsReaddirSyncSpy = jest.spyOn(fs, 'readdirSync');
  });

  afterEach(() => {
    pathResolveSpy.mockRestore();
    pathRelativeSpy.mockRestore();
    pathDirnameSpy.mockRestore();
    fsStatSyncSpy.mockRestore();
    fsReaddirSyncSpy.mockRestore();
  });

  it('should upload files', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    fsStatSyncSpy.mockReturnValueOnce({
      isDirectory() {
        return false;
      },
    } as any);

    pathResolveSpy.mockImplementationOnce((p) => p);
    pathRelativeSpy.mockImplementationOnce((_, p) => p);
    pathDirnameSpy.mockImplementation((_: string) => '.');

    await handlePush({
      argv: {
        domain: 'test-domain',
        'mount-path': 'test-mount-path',
        organization: 'test-org',
        project: 'test-project',
        branch: 'test-branch',
        namespace: 'test-namespace',
        repository: 'test-repository',
        'commit-sha': 'test-commit-sha',
        'commit-url': 'test-commit-url',
        'default-branch': 'test-branch',
        'created-at': 'test-created-at',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        files: ['test-file'],
        'max-execution-time': 10,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(remotes.getDefaultBranch).toHaveBeenCalledWith('test-org', 'test-project');
    expect(remotes.upsert).toHaveBeenCalledWith('test-org', 'test-project', {
      mountBranchName: 'test-default-branch',
      mountPath: 'test-mount-path',
    });
    expect(remotes.push).toHaveBeenCalledWith(
      'test-org',
      'test-project',
      {
        isMainBranch: true,
        remoteId: 'test-remote-id',
        commit: {
          message: 'Test message',
          branchName: 'test-branch',
          createdAt: 'test-created-at',
          namespace: 'test-namespace',
          repository: 'test-repository',
          sha: 'test-commit-sha',
          url: 'test-commit-url',
          author: {
            name: 'TestAuthor',
            email: 'test-author@mail.com',
          },
        },
      },
      [
        {
          path: 'test-file',
          stream: 'stream',
        },
      ]
    );
  });

  it('should return push id', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    fsStatSyncSpy.mockReturnValueOnce({
      isDirectory() {
        return false;
      },
    } as any);

    pathResolveSpy.mockImplementationOnce((p) => p);
    pathRelativeSpy.mockImplementationOnce((_, p) => p);
    pathDirnameSpy.mockImplementation((_: string) => '.');

    const result = await handlePush({
      argv: {
        domain: 'test-domain',
        'mount-path': 'test-mount-path',
        organization: 'test-org',
        project: 'test-project',
        branch: 'test-branch',
        namespace: 'test-namespace',
        repository: 'test-repository',
        'commit-sha': 'test-commit-sha',
        'commit-url': 'test-commit-url',
        'default-branch': 'test-branch',
        'created-at': 'test-created-at',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        files: ['test-file'],
        'max-execution-time': 10,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(result).toEqual({ pushId: 'test-id' });
  });

  it('should collect files from directory and preserve file structure', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    /*
      ├── app
      │   ├── index.html
      ├── openapi.yaml
      └── some-ref.yaml
    */

    fsStatSyncSpy.mockImplementation(
      (filePath) =>
        ({
          isDirectory() {
            return filePath === 'test-folder' || filePath === 'test-folder/app';
          },
        } as any)
    );

    fsReaddirSyncSpy.mockImplementation((dirPath): any => {
      if (dirPath === 'test-folder') {
        return ['app', 'another-ref.yaml', 'openapi.yaml'];
      }

      if (dirPath === 'test-folder/app') {
        return ['index.html'];
      }

      throw new Error('Not a directory');
    });

    await handlePush({
      argv: {
        domain: 'test-domain',
        'mount-path': 'test-mount-path',
        organization: 'test-org',
        project: 'test-project',
        branch: 'test-branch',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        'default-branch': 'main',
        files: ['test-folder'],
        'max-execution-time': 10,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(remotes.push).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      [
        {
          path: 'app/index.html',
          stream: 'stream',
        },

        {
          path: 'another-ref.yaml',
          stream: 'stream',
        },
        {
          path: 'openapi.yaml',
          stream: 'stream',
        },
      ]
    );
  });

  it('should not upload files if no files passed', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    await handlePush({
      argv: {
        domain: 'test-domain',
        'mount-path': 'test-mount-path',
        organization: 'test-org',
        project: 'test-project',
        branch: 'test-branch',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        'default-branch': 'main',
        files: [],
        'max-execution-time': 10,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(remotes.getDefaultBranch).not.toHaveBeenCalled();
    expect(remotes.upsert).not.toHaveBeenCalled();
    expect(remotes.push).not.toHaveBeenCalled();
  });

  it('should get organization from config if not passed', async () => {
    const mockConfig = { organization: 'test-org-from-config', apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    fsStatSyncSpy.mockReturnValueOnce({
      isDirectory() {
        return false;
      },
    } as any);

    pathResolveSpy.mockImplementationOnce((p) => p);
    pathRelativeSpy.mockImplementationOnce((_, p) => p);
    pathDirnameSpy.mockImplementation((_: string) => '.');

    await handlePush({
      argv: {
        domain: 'test-domain',
        'mount-path': 'test-mount-path',
        project: 'test-project',
        branch: 'test-branch',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        files: ['test-file'],
        'default-branch': 'main',
        'max-execution-time': 10,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(remotes.getDefaultBranch).toHaveBeenCalledWith(
      'test-org-from-config',
      expect.anything()
    );
    expect(remotes.upsert).toHaveBeenCalledWith(
      'test-org-from-config',
      expect.anything(),
      expect.anything()
    );
    expect(remotes.push).toHaveBeenCalledWith(
      'test-org-from-config',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it('should get domain from env if not passed', async () => {
    const mockConfig = { organization: 'test-org-from-config', apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';
    process.env.REDOCLY_DOMAIN = 'test-domain-from-env';

    fsStatSyncSpy.mockReturnValueOnce({
      isDirectory() {
        return false;
      },
    } as any);

    pathResolveSpy.mockImplementationOnce((p) => p);
    pathRelativeSpy.mockImplementationOnce((_, p) => p);
    pathDirnameSpy.mockImplementation((_: string) => '.');

    await handlePush({
      argv: {
        'mount-path': 'test-mount-path',
        project: 'test-project',
        branch: 'test-branch',
        'default-branch': 'main',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        files: ['test-file'],
        'max-execution-time': 10,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(ReuniteApi).toBeCalledWith({
      domain: 'test-domain-from-env',
      apiKey: 'test-api-key',
      version: 'cli-version',
      command: 'push',
    });
  });

  it('should print error message', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    remotes.push.mockRestore();
    remotes.push.mockRejectedValueOnce(new ReuniteApiError('Deprecated.', 412));

    fsStatSyncSpy.mockReturnValueOnce({
      isDirectory() {
        return false;
      },
    } as any);

    pathResolveSpy.mockImplementationOnce((p) => p);
    pathRelativeSpy.mockImplementationOnce((_, p) => p);
    pathDirnameSpy.mockImplementation((_: string) => '.');

    expect(
      handlePush({
        argv: {
          domain: 'test-domain',
          'mount-path': 'test-mount-path',
          organization: 'test-org',
          project: 'test-project',
          branch: 'test-branch',
          namespace: 'test-namespace',
          repository: 'test-repository',
          'commit-sha': 'test-commit-sha',
          'commit-url': 'test-commit-url',
          'default-branch': 'test-branch',
          'created-at': 'test-created-at',
          author: 'TestAuthor <test-author@mail.com>',
          message: 'Test message',
          files: ['test-file'],
          'max-execution-time': 10,
        },
        config: mockConfig,
        version: 'cli-version',
      })
    ).rejects.toThrow('✗ File upload failed. Reason: Deprecated.');
  });
});
