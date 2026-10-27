import { safeJoinPath } from '@n8n/backend-common';
import { UserError } from 'n8n-workflow';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';

export type EventLogProcessType = 'main' | 'worker' | 'webhook-processor';

export interface ResolveEventLogPathInput {
	logFullPath: string;
	logBaseName: string;
	instanceDir: string;
	processType: EventLogProcessType;
}

export interface ResolvedEventLogPath {
	logFullBasePath: string;
	logFileName: string;
}

const LOG_FILE_EXTENSION = '.log';
const ENV_VAR = 'N8N_EVENTBUS_LOGWRITER_LOGFULLPATH';

export function resolveEventLogPath(input: ResolveEventLogPathInput): ResolvedEventLogPath {
	const { logFullPath, logBaseName, instanceDir, processType } = input;

	if (logFullPath) {
		if (!isAbsolute(logFullPath)) {
			throw new UserError(`${ENV_VAR} must be an absolute path, got: ${logFullPath}`);
		}
		if (!logFullPath.endsWith(LOG_FILE_EXTENSION)) {
			throw new UserError(`${ENV_VAR} must end in '${LOG_FILE_EXTENSION}', got: ${logFullPath}`);
		}

		const parent = dirname(logFullPath);
		if (!existsSync(parent)) {
			mkdirSync(parent, { recursive: true });
		}

		const logFullBasePath = logFullPath.slice(0, -LOG_FILE_EXTENSION.length);
		return { logFullBasePath, logFileName: logFullPath };
	}

	const suffix =
		processType === 'worker'
			? '-worker'
			: processType === 'webhook-processor'
				? '-webhook-processor'
				: '';
	const logFullBasePath = safeJoinPath(instanceDir, `${logBaseName}${suffix}`);
	return { logFullBasePath, logFileName: `${logFullBasePath}${LOG_FILE_EXTENSION}` };
}
