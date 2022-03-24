import { readFileSync, rmSync } from 'fs';
import { UserSettings } from 'n8n-core';
import { getLogger } from '../../Logger';

const PERSONALIZATION_SURVEY_FILENAME = 'personalizationSurvey.json';

export function loadSurveyFromDisk(): string | null {
	const userSettingsPath = UserSettings.getUserN8nFolderPath();
	try {
		const filename = `${userSettingsPath}/${PERSONALIZATION_SURVEY_FILENAME}`;
		const surveyFile = readFileSync(filename, 'utf-8');
		rmSync(filename);
		const personalizationSurvey = JSON.parse(surveyFile) as object;
		const kvPairs = Object.entries(personalizationSurvey);
		if (!kvPairs.length) {
			throw new Error('personalizationSurvey is empty');
		} else {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const emptyKeys = kvPairs.reduce((acc, [_key, value]) => {
				if (!value || (Array.isArray(value) && !value.length)) {
					return acc + 1;
				}
				return acc;
			}, 0);
			if (emptyKeys === kvPairs.length) {
				throw new Error('incomplete personalizationSurvey');
			}
		}
		return surveyFile;
	} catch (error) {
		return null;
	}
}

let logFinishTimeout: NodeJS.Timeout;
const disableLogging = process.argv[1].split('/').includes('jest');

export function logMigrationStart(migrationName: string): void {
	if (disableLogging) return;
	const logger = getLogger();
	if (!logFinishTimeout) {
		logger.warn('Migrations in progress, please do NOT stop the process.');
	}
	logger.debug(`Starting migration ${migrationName}`);
	clearTimeout(logFinishTimeout);
}

export function logMigrationEnd(migrationName: string): void {
	if (disableLogging) return;
	const logger = getLogger();
	logger.debug(`Finished migration ${migrationName}`);
	logFinishTimeout = setTimeout(() => {
		logger.warn('Migrations finished.');
	}, 100);
}
