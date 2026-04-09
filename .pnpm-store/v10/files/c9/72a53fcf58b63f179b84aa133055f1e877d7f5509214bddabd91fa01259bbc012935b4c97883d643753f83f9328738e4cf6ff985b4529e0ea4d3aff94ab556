import { blue, green, gray, yellow } from 'colorette';
import { RedoclyClient } from '@redocly/openapi-core';
import { exitWithError, promptUser } from '../utils/miscellaneous';
import { RedoclyOAuthClient } from '../auth/oauth-client';
import { getReuniteUrl } from '../reunite/api';

import type { CommandArgs } from '../wrapper';
import type { Region } from '@redocly/openapi-core';

export function promptClientToken(domain: string) {
  return promptUser(
    green(
      `\n  🔑 Copy your API key from ${blue(`https://app.${domain}/profile`)} and paste it below`
    ) + yellow(' (if you want to log in with Reunite, please run `redocly login --next` instead)'),
    true
  );
}

export type LoginOptions = {
  verbose?: boolean;
  residency?: string;
  config?: string;
  next?: boolean;
};

export async function handleLogin({ argv, config, version }: CommandArgs<LoginOptions>) {
  if (argv.next) {
    try {
      const reuniteUrl = getReuniteUrl(argv.residency);
      const oauthClient = new RedoclyOAuthClient('redocly-cli', version);
      await oauthClient.login(reuniteUrl);
    } catch {
      if (argv.residency) {
        const reuniteUrl = getReuniteUrl(argv.residency);
        exitWithError(`❌ Connection to ${reuniteUrl} failed.`);
      } else {
        exitWithError(`❌ Login failed. Please check your credentials and try again.`);
      }
    }
  } else {
    try {
      const region = (argv.residency as Region) || config.region;
      const client = new RedoclyClient(region);
      const clientToken = await promptClientToken(client.domain);
      process.stdout.write(gray('\n  Logging in...\n'));
      await client.login(clientToken, argv.verbose);
      process.stdout.write(green('  Authorization confirmed. ✅\n\n'));
    } catch (err) {
      exitWithError('  ' + err?.message);
    }
  }
}

export type LogoutOptions = {
  config?: string;
};

export async function handleLogout({ version }: CommandArgs<LogoutOptions>) {
  const client = new RedoclyClient();
  client.logout();

  const oauthClient = new RedoclyOAuthClient('redocly-cli', version);
  oauthClient.logout();

  process.stdout.write('Logged out from the Redocly account. ✋ \n');
}
