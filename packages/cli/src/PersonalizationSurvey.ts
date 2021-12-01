import { readFileSync, writeFile } from 'fs';
import { promisify } from 'util';
import { UserSettings } from 'n8n-core';

import * as config from '../config';
// eslint-disable-next-line import/no-cycle
import { IPersonalizationSurvey, IPersonalizationSurveyAnswers } from '.';

const fsWriteFile = promisify(writeFile);

const PERSONALIZATION_SURVEY_FILENAME = 'personalizationSurvey.json';

function loadSurveyFromDisk(): IPersonalizationSurveyAnswers | undefined {
	const userSettingsPath = UserSettings.getUserN8nFolderPath();
	try {
		const surveyFile = readFileSync(
			`${userSettingsPath}/${PERSONALIZATION_SURVEY_FILENAME}`,
			'utf-8',
		);
		return JSON.parse(surveyFile) as IPersonalizationSurveyAnswers;
	} catch (error) {
		return undefined;
	}
}

export async function writeSurveyToDisk(
	surveyAnswers: IPersonalizationSurveyAnswers,
): Promise<void> {
	const userSettingsPath = UserSettings.getUserN8nFolderPath();
	await fsWriteFile(
		`${userSettingsPath}/${PERSONALIZATION_SURVEY_FILENAME}`,
		JSON.stringify(surveyAnswers, null, '\t'),
	);
}

export async function preparePersonalizationSurvey(): Promise<IPersonalizationSurvey> {
	const survey: IPersonalizationSurvey = {
		shouldShow: false,
	};

	survey.answers = loadSurveyFromDisk();

	// Do not show survey if it has been previously answered
	if (survey.answers) {
		return survey;
	}

	// or if user opted out of personalization
	const enabled = config.get('personalization.enabled') as boolean;

	if (!enabled) {
		return survey;
	}

	survey.shouldShow = true;
	return survey;
}
