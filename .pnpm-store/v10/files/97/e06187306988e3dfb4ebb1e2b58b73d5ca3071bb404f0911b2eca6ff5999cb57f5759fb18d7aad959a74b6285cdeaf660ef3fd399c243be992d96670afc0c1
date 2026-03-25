import * as fs from 'fs';
import * as path from 'path';
import { slash } from '@redocly/openapi-core';
import { pluralize } from '@redocly/openapi-core/lib/utils';
import { green, yellow } from 'colorette';
import { exitWithError, printExecutionTime } from '../../utils/miscellaneous';
import { handlePushStatus } from './push-status';
import { ReuniteApi, getDomain, getApiKeys } from '../api';
import { handleReuniteError } from './utils';

import type { OutputFormat } from '@redocly/openapi-core';
import type { CommandArgs } from '../../wrapper';
import type { VerifyConfigOptions } from '../../types';

export type PushOptions = {
  apis?: string[];
  organization?: string;
  project: string;
  'mount-path': string;

  branch: string;
  author: string;
  message: string;
  'commit-sha'?: string;
  'commit-url'?: string;
  namespace?: string;
  repository?: string;
  'created-at'?: string;

  files: string[];

  'default-branch': string;
  domain?: string;
  'wait-for-deployment'?: boolean;
  'max-execution-time': number;
  'continue-on-deploy-failures'?: boolean;
  verbose?: boolean;
  format?: Extract<OutputFormat, 'stylish'>;
} & VerifyConfigOptions;

type FileToUpload = { name: string; path: string };

export async function handlePush({
  argv,
  config,
  version,
}: CommandArgs<PushOptions>): Promise<{ pushId: string } | void> {
  const startedAt = performance.now(); // for printing execution time
  const startTime = Date.now(); // for push-status command

  const { organization, project: projectId, 'mount-path': mountPath, verbose } = argv;

  const orgId = organization || config.organization;

  if (!argv.message || !argv.author || !argv.branch) {
    exitWithError('Error: message, author and branch are required for push to the Reunite.');
  }

  if (!orgId) {
    return exitWithError(
      `No organization provided, please use --organization option or specify the 'organization' field in the config file.`
    );
  }

  const domain = argv.domain || getDomain();

  if (!domain) {
    return exitWithError(
      `No domain provided, please use --domain option or environment variable REDOCLY_AUTHORIZATION.`
    );
  }

  try {
    const {
      'commit-sha': commitSha,
      'commit-url': commitUrl,
      'default-branch': defaultBranch,
      'wait-for-deployment': waitForDeployment,
      'max-execution-time': maxExecutionTime,
    } = argv;
    const author = parseCommitAuthor(argv.author);
    const apiKey = getApiKeys(domain);
    const filesToUpload = collectFilesToPush(argv.files || argv.apis);
    const commandName = 'push' as const;

    if (!filesToUpload.length) {
      return printExecutionTime(commandName, startedAt, `No files to upload`);
    }

    const client = new ReuniteApi({ domain, apiKey, version, command: commandName });
    const projectDefaultBranch = await client.remotes.getDefaultBranch(orgId, projectId);
    const remote = await client.remotes.upsert(orgId, projectId, {
      mountBranchName: projectDefaultBranch,
      mountPath,
    });

    process.stderr.write(
      `Uploading to ${remote.mountPath} ${filesToUpload.length} ${pluralize(
        'file',
        filesToUpload.length
      )}:\n`
    );

    const { id } = await client.remotes.push(
      orgId,
      projectId,
      {
        remoteId: remote.id,
        commit: {
          message: argv.message,
          branchName: argv.branch,
          sha: commitSha,
          url: commitUrl,
          createdAt: argv['created-at'],
          namespace: argv.namespace,
          repository: argv.repository,
          author,
        },
        isMainBranch: defaultBranch === argv.branch,
      },
      filesToUpload.map((f) => ({ path: slash(f.name), stream: fs.createReadStream(f.path) }))
    );

    filesToUpload.forEach((f) => {
      process.stderr.write(green(`✓ ${f.name}\n`));
    });

    process.stdout.write('\n');
    process.stdout.write(`Push ID: ${id}\n`);

    if (waitForDeployment) {
      process.stdout.write('\n');

      await handlePushStatus({
        argv: {
          organization: orgId,
          project: projectId,
          pushId: id,
          wait: true,
          domain,
          'max-execution-time': maxExecutionTime,
          'start-time': startTime,
          'continue-on-deploy-failures': argv['continue-on-deploy-failures'],
        },
        config,
        version,
      });
    }
    verbose &&
      printExecutionTime(
        commandName,
        startedAt,
        `${pluralize(
          'file',
          filesToUpload.length
        )} uploaded to organization ${orgId}, project ${projectId}. Push ID: ${id}.`
      );

    client.reportSunsetWarnings();

    return {
      pushId: id,
    };
  } catch (err) {
    handleReuniteError('✗ File upload failed.', err);
  }
}

function parseCommitAuthor(author: string): { name: string; email: string } {
  // Author Name <author@email.com>
  const reg = /^.+\s<[^<>]+>$/;

  if (!reg.test(author)) {
    throw new Error('Invalid author format. Use "Author Name <author@email.com>"');
  }

  const [name, email] = author.split('<');

  return {
    name: name.trim(),
    email: email.replace('>', '').trim(),
  };
}

function collectFilesToPush(files: string[]): FileToUpload[] {
  const collectedFiles: Record<string, string> = {};

  for (const file of files) {
    if (fs.statSync(file).isDirectory()) {
      const dir = file;
      const fileList = getFilesList(dir, []);

      fileList.forEach((f) => addFile(f, dir));
    } else {
      addFile(file, path.dirname(file));
    }
  }

  function addFile(filePath: string, fileDir: string) {
    const fileName = path.relative(fileDir, filePath);

    if (collectedFiles[fileName]) {
      process.stdout.write(
        yellow(`File ${collectedFiles[fileName]} is overwritten by ${filePath}\n`)
      );
    }

    collectedFiles[fileName] = filePath;
  }

  return Object.entries(collectedFiles).map(([name, filePath]) => getFileEntry(name, filePath));
}

function getFileEntry(name: string, filePath: string): FileToUpload {
  return {
    name,
    path: path.resolve(filePath),
  };
}

function getFilesList(dir: string, files: string[]): string[] {
  const filesAndDirs = fs.readdirSync(dir);

  for (const name of filesAndDirs) {
    const currentPath = path.join(dir, name);

    if (fs.statSync(currentPath).isDirectory()) {
      files = getFilesList(currentPath, files);
    } else {
      files.push(currentPath);
    }
  }

  return files;
}
