import { readFileSync, writeFile } from 'fs';
import { promisify } from 'util';
import { UserSettings } from 'n8n-core';

import * as config from '../config';
// eslint-disable-next-line import/no-cycle
import { Db, IPersonalizationSurvey, IPersonalizationSurveyAnswers } from '.';

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

	if (survey.answers) {
		return survey;
	}

	const enabled =
		(config.get('personalization.enabled') as boolean) &&
		(config.get('diagnostics.enabled') as boolean);

	if (!enabled) {
		return survey;
	}

	const workflowsExist = !!(await Db.collections.Workflow?.findOne());

	if (workflowsExist) {
		return survey;
	}

	survey.shouldShow = true;
	return survey;
}
