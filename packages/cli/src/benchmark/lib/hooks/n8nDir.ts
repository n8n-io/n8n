import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import Container from 'typedi';
import { InstanceSettings } from 'n8n-core';
import { log } from '../log';

/**
 * Create a temp .n8n user dir for benchmarking.
 */
export function n8nDir() {
	const tempBaseDir = path.join(tmpdir(), 'n8n-benchmarks/');

	mkdirSync(tempBaseDir, { recursive: true });

	const tempUserHomeDir = mkdtempSync(tempBaseDir);

	const tempN8nDir = path.join(tempUserHomeDir, '.n8n');

	mkdirSync(tempN8nDir);

	writeFileSync(
		path.join(tempN8nDir, 'config'),
		JSON.stringify({ encryptionKey: 'temp-encryption-key', instanceId: 'temp-123' }),
		'utf-8',
	);

	process.env.N8N_USER_FOLDER = tempUserHomeDir;

	/**
	 * `typedi` has already instantiated `InstanceSettings` using the default user home,
	 * so re-instantiate it to ensure it picks up the temp user home dir path.
	 */
	Container.set(InstanceSettings, new InstanceSettings());

	log('Created temp dir', tempN8nDir);
}
