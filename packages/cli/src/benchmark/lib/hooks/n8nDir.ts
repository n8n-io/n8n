import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import Container from 'typedi';
import { InstanceSettings } from 'n8n-core';
import { Logger } from '@/Logger';

export function n8nDir() {
	const baseDirPath = path.join(tmpdir(), 'n8n-benchmarks/');

	mkdirSync(baseDirPath, { recursive: true });

	const userDir = mkdtempSync(baseDirPath);

	const n8nDirPath = path.join(userDir, '.n8n');

	mkdirSync(n8nDirPath);

	writeFileSync(
		path.join(n8nDirPath, 'config'),
		JSON.stringify({ encryptionKey: 'temp_encryption_key', instanceId: 'temp-123' }),
		'utf-8',
	);

	// @TODO: Find better approach than overriding like this
	// Setting N8N_USER_FOLDER has no effect
	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.n8nFolder = n8nDirPath;
	Container.set(InstanceSettings, instanceSettings);

	Container.get(Logger).info(
		`[Benchmarking] Temp .n8n dir location: ${instanceSettings.n8nFolder}`,
	);
}
