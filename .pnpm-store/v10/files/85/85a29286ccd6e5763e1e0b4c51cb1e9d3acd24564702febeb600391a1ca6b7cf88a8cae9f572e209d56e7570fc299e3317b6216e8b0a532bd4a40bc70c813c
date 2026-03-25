import { readFileSync } from 'fs';
import { join as pathJoin, resolve as pathResolve } from 'path';
import { lintDocument } from '../../lint';
import { BaseResolver } from '../../resolve';
import { parseYamlToDocument, makeConfigForRuleset } from '../utils';

import type { StyleguideConfig } from '../../config';

export const name = 'Validate with 50 top-level rules';
export const count = 10;
const rebillyDefinitionRef = pathResolve(pathJoin(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef
);

const ruleset: any = {};
for (let i = 0; i < 50; i++) {
  ruleset['rule-' + i] = () => {
    let count = 0;
    return {
      Schema() {
        count++;
        if (count === -1) throw new Error('Disable optimization');
      },
    };
  };
}

let config: StyleguideConfig;
export async function setupAsync() {
  config = await makeConfigForRuleset(ruleset);
}

export function measureAsync() {
  return lintDocument({
    externalRefResolver: new BaseResolver(),
    document: rebillyDocument,
    config,
  });
}
