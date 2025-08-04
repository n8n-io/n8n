'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const fs_1 = require('fs');
const os_1 = require('os');
const path_1 = require('path');
process.env.N8N_ENCRYPTION_KEY = 'test_key';
const baseDir = (0, path_1.join)((0, os_1.tmpdir)(), 'n8n-tests/');
(0, fs_1.mkdirSync)(baseDir, { recursive: true });
const testDir = (0, fs_1.mkdtempSync)(baseDir);
(0, fs_1.mkdirSync)((0, path_1.join)(testDir, '.n8n'));
process.env.N8N_USER_FOLDER = testDir;
process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'false';
(0, fs_1.writeFileSync)(
	(0, path_1.join)(testDir, '.n8n/config'),
	JSON.stringify({ encryptionKey: 'test_key', instanceId: '123' }),
	{
		encoding: 'utf-8',
		mode: 0o600,
	},
);
require('@/config');
//# sourceMappingURL=setup-test-folder.js.map
