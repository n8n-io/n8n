import * as path from 'path';
import { readFileSync } from 'fs';
import { resolveDocument, BaseResolver } from '../../resolve';
import { parseYamlToDocument } from '../utils';
import { Oas3Types } from '../../types/oas3';
import { normalizeTypes } from '../../types';

export const name = 'Resolve with no external refs';
export const count = 10;
const rebillyDefinitionRef = path.resolve(path.join(__dirname, 'rebilly.yaml'));
const rebillyDocument = parseYamlToDocument(
  readFileSync(rebillyDefinitionRef, 'utf-8'),
  rebillyDefinitionRef
);
const externalRefResolver = new BaseResolver();

export function measureAsync() {
  return resolveDocument({
    rootDocument: rebillyDocument,
    externalRefResolver,
    rootType: normalizeTypes(Oas3Types).Root,
  });
}
