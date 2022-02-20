import { readFileSync, rmSync } from 'fs';
import { UserSettings } from 'n8n-core';

const PERSONALIZATION_SURVEY_FILENAME = 'personalizationSurvey.json';

export function loadSurveyFromDisk(): string | undefined {
	const userSettingsPath = UserSettings.getUserN8nFolderPath();
	try {
		const filename = `${userSettingsPath}/${PERSONALIZATION_SURVEY_FILENAME}`;
		const surveyFile = readFileSync(filename, 'utf-8');
		rmSync(filename);
		return surveyFile;
	} catch (error) {
		return undefined;
	}
}
