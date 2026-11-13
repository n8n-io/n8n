import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// n8n-core writes its settings to the n8n user folder. Tests use their own.
process.env.N8N_USER_FOLDER ??= mkdtempSync(join(tmpdir(), 'wf-fallback-host-test-'));
