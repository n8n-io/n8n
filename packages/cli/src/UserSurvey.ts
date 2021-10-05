import { readFileSync, writeFile } from 'fs';
import { promisify } from 'util';
import { UserSettings } from 'n8n-core';

import * as config from '../config';
// eslint-disable-next-line import/no-cycle
import { Db, IUserSurvey, IUserSurveyAnswers } from '.';

const fsWriteFile = promisify(writeFile);

function loadUserSurveyFromDisk(): IUserSurveyAnswers | undefined {
	const userSettingsPath = UserSettings.getUserN8nFolderPath();
	try {
		const userSurveyFile = readFileSync(`${userSettingsPath}/userSurvey`, 'utf-8');
		return JSON.parse(userSurveyFile) as IUserSurveyAnswers;
	} catch (error) {
		return undefined;
	}
}

export async function writeUserSurveyToDisk(userSurveyAnswers: IUserSurveyAnswers): Promise<void> {
	const userSettingsPath = UserSettings.getUserN8nFolderPath();
	await fsWriteFile(
		`${userSettingsPath}/userSurvey`,
		JSON.stringify(userSurveyAnswers, null, '\t'),
	);
}

export async function prepareUserSurvey(): Promise<IUserSurvey> {
	const userSurvey: IUserSurvey = {
		shouldShow: false,
	};

	userSurvey.answers = loadUserSurveyFromDisk();

	if (userSurvey.answers) {
		return userSurvey;
	}

	const enabled =
		(config.get('userSurvey.enabled') as boolean) && (config.get('telemetry.enabled') as boolean);

	if (!enabled) {
		return userSurvey;
	}

	const workflowsExist = !!(await Db.collections.Workflow?.findOne());

	if (workflowsExist) {
		return userSurvey;
	}

	userSurvey.shouldShow = true;
	return userSurvey;
}
