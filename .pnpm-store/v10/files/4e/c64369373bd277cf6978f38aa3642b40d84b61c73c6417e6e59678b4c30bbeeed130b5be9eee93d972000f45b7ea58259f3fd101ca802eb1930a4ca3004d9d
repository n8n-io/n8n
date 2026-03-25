import { blue, green, gray } from 'colorette';
import { RedoclyClient } from '@redocly/openapi-core';
import { exitWithError, promptUser } from '../utils/miscellaneous';

import type { CommandArgs } from '../wrapper';
import type { Region } from '@redocly/openapi-core';

export function promptClientToken(domain: string) {
  return promptUser(
    green(
      `\n  🔑 Copy your API key from ${blue(`https://app.${domain}/profile`)} and paste it below`
    ),
    true
  );
}

export type LoginOptions = {
  verbose?: boolean;
  region?: Region;
  config?: string;
};

export async function handleLogin({ argv, config }: CommandArgs<LoginOptions>) {
  try {
    const region = argv.region || config.region;
    const client = new RedoclyClient(region);
    const clientToken = await promptClientToken(client.domain);
    process.stdout.write(gray('\n  Logging in...\n'));
    await client.login(clientToken, argv.verbose);
    process.stdout.write(green('  Authorization confirmed. ✅\n\n'));
  } catch (err) {
    exitWithError('  ' + err?.message);
  }
}
