import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { InstanceSettings } from 'n8n-core';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { touchFile } from './crash-journal';

const { n8nFolder } = Container.get(InstanceSettings);
const journalFile = join(n8nFolder, 'crash.journal');
const crashCounterFile = join(n8nFolder, 'crash.counter');

export const checkForSafeMode = async (): Promise<boolean> => {
	const globalConfig = Container.get(GlobalConfig);

	if (globalConfig.generic.safeMode) {
		Container.get(Logger).info('Safe mode enabled via N8N_SAFE_MODE environment variable');
		await touchFile(journalFile);
		return true;
	}

	let crashCount = 0;

	if (existsSync(journalFile)) {
		try {
			crashCount = parseInt(await readFile(crashCounterFile, 'utf8')) + 1;
		} catch {
			crashCount = 1;
		}
		await writeFile(crashCounterFile, crashCount.toString());
		Container.get(Logger).error(`Crash detected (${crashCount} consecutive crashes)`);

		if (crashCount >= 3) {
			Container.get(Logger).warn('Crash threshold reached - entering safe mode');
		}
	}

	await touchFile(journalFile);
	return crashCount >= 3;
};

export const resetCrashCounter = async (): Promise<void> => {
	await writeFile(crashCounterFile, '0');
	Container.get(Logger).debug('Crash counter reset - startup completed successfully');
};

export const exitSafeMode = async (): Promise<void> => {
	await writeFile(crashCounterFile, '0');
	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.setSafeMode(false);
	Container.get(Logger).info('Safe mode exited');
};
