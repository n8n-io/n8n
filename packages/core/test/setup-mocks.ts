import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import 'reflect-metadata';

const originalUserFolder = process.env.N8N_USER_FOLDER;
const testUserFolder = mkdtempSync(join(tmpdir(), 'n8n-core-test-'));

process.env.N8N_USER_FOLDER = testUserFolder;

afterAll(() => {
	if (originalUserFolder === undefined) {
		delete process.env.N8N_USER_FOLDER;
	} else {
		process.env.N8N_USER_FOLDER = originalUserFolder;
	}

	rmSync(testUserFolder, { recursive: true, force: true });
});
