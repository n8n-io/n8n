import { readFileSync } from 'fs';
import { join as pathJoin, resolve as pathResolve } from 'path';
import { lintDocument } from '../../lint';
import { BaseResolver } from '../../resolve';
import { parseYamlToDocument, makeConfigForRuleset } from '../utils';

import type { StyleguideConfig } from '../../config';

export const name = 'Validate with no rules';
export const count = 10;
const rebillyDefinitionRef = pathResolve(pathJoin(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef
);

let config: StyleguideConfig;
export async function setupAsync() {
  config = await makeConfigForRuleset({});
}
export function measureAsync() {
  return lintDocument({
    externalRefResolver: new BaseResolver(),
    document: rebillyDocument,
    config,
  });
}
