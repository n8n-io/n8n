import path from 'node:path';

export const NODE_DIR = 'packages/nodes-base/nodes/N8n/v2';

export const REPO_ROOT = path.resolve(__dirname, '../../../..');
export const SPEC_DIR = path.join(REPO_ROOT, 'packages/cli/src/public-api/v1');
export const OVERRIDES_FILE = `${NODE_DIR}/overrides.ts`;
export const README_FILE = `${NODE_DIR}/README.md`;
export const CONTRACT_FILE = `${NODE_DIR}/generated/contract.generated.json`;
export const DESCRIPTION_FILE = `${NODE_DIR}/generated/description.generated.ts`;
