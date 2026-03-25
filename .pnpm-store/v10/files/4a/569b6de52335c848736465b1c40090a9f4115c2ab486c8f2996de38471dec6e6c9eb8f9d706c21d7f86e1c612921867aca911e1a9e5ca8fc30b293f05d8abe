import { resolve } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import { isNotEmptyObject } from '@redocly/openapi-core/lib/utils';
import { TOKEN_FILENAME } from '@redocly/openapi-core/lib/redocly';

function readCredentialsFile(credentialsPath: string) {
  return existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, 'utf-8')) : {};
}

export function getApiKeys(domain: string) {
  const apiKey = process.env.REDOCLY_AUTHORIZATION;

  if (apiKey) {
    return apiKey;
  }

  const credentialsPath = resolve(homedir(), TOKEN_FILENAME);
  const credentials = readCredentialsFile(credentialsPath);

  if (isNotEmptyObject(credentials) && credentials[domain]) {
    return credentials[domain];
  }

  throw new Error('No api key provided, please use environment variable REDOCLY_AUTHORIZATION.');
}
