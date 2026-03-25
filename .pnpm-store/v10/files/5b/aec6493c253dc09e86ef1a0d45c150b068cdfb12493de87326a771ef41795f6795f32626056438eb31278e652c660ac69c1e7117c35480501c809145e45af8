import { spawn } from 'child_process';
import { getPlatformSpawnArgs, sanitizePath } from '../utils/platform';

import type { CommandArgs } from '../wrapper';
import type { VerifyConfigOptions } from '../types';

export type EjectOptions = {
  type: 'component';
  path?: string;
  'project-dir'?: string;
  force: boolean;
} & VerifyConfigOptions;

export const handleEject = async ({ argv }: CommandArgs<EjectOptions>) => {
  process.stdout.write(`\nLaunching eject using NPX.\n\n`);
  const { npxExecutableName, sanitize, shell } = getPlatformSpawnArgs();

  const path = sanitize(argv.path, sanitizePath);
  const projectDir = sanitize(argv['project-dir'], sanitizePath);

  const child = spawn(
    npxExecutableName,
    [
      '-y',
      '@redocly/realm',
      'eject',
      `${argv.type}`,
      path,
      `-d=${projectDir}`,
      argv.force ? `--force=${argv.force}` : '',
    ],
    {
      stdio: 'inherit',
      shell,
    }
  );

  child.on('error', (error) => {
    process.stderr.write(`Eject launch failed: ${error.message}`);
    throw new Error('Eject launch failed.');
  });
};
