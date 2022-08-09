
import { CALENDLY_TRIGGER_NODE_TYPE, CLEARBIT_NODE_TYPE, COMPANY_SIZE_1000_OR_MORE, COMPANY_SIZE_500_999, CRON_NODE_TYPE, ELASTIC_SECURITY_NODE_TYPE, EMAIL_SEND_NODE_TYPE, EXECUTE_COMMAND_NODE_TYPE, FINANCE_WORK_AREA, FUNCTION_NODE_TYPE, GITHUB_TRIGGER_NODE_TYPE, HTTP_REQUEST_NODE_TYPE, IF_NODE_TYPE, ITEM_LISTS_NODE_TYPE, IT_ENGINEERING_WORK_AREA, JIRA_TRIGGER_NODE_TYPE, MICROSOFT_EXCEL_NODE_TYPE, MICROSOFT_TEAMS_NODE_TYPE, PAGERDUTY_NODE_TYPE, PRODUCT_WORK_AREA, QUICKBOOKS_NODE_TYPE, SALESFORCE_NODE_TYPE, SALES_BUSINESSDEV_WORK_AREA, SECURITY_WORK_AREA, SEGMENT_NODE_TYPE, SET_NODE_TYPE, SLACK_NODE_TYPE, SPREADSHEET_FILE_NODE_TYPE, SWITCH_NODE_TYPE, WEBHOOK_NODE_TYPE, XERO_NODE_TYPE, COMPANY_SIZE_KEY, WORK_AREA_KEY, CODING_SKILL_KEY, COMPANY_TYPE_KEY, ECOMMERCE_COMPANY_TYPE, MSP_COMPANY_TYPE, PERSONAL_COMPANY_TYPE, AUTOMATION_GOAL_KEY, OTHER_AUTOMATION_GOAL, NOT_SURE_YET_GOAL, CUSTOMER_INTEGRATIONS_GOAL, CUSTOMER_SUPPORT_GOAL, FINANCE_ACCOUNTING_GOAL, ZENDESK_TRIGGER_NODE_TYPE, WOOCOMMERCE_TRIGGER_NODE_TYPE, SALES_MARKETING_GOAL, HUBSPOT_TRIGGER_NODE_TYPE, HR_GOAL, WORKABLE_TRIGGER_NODE_TYPE, OPERATIONS_GOAL, PRODUCT_GOAL, NOTION_TRIGGER_NODE_TYPE, SECURITY_GOAL, THE_HIVE_TRIGGER_NODE_TYPE, ZENDESK_NODE_TYPE, SERVICENOW_NODE_TYPE, JIRA_NODE_TYPE, BAMBOO_HR_NODE_TYPE, GOOGLE_SHEETS_NODE_TYPE } from '@/constants';
import { IPermissions, IPersonalizationSurveyAnswersV1, IPersonalizationSurveyAnswersV2, IPersonalizationSurveyAnswersV3, IPersonalizationSurveyVersions, IUser } from '@/Interface';

import { ILogInStatus, IRole, IUserPermissions } from "@/Interface";

function isPersonalizationV2OrV3(data: IPersonalizationSurveyVersions): data is IPersonalizationSurveyAnswersV2 | IPersonalizationSurveyAnswersV3 {
	return "version" in data;
}

export const ROLE: {Owner: IRole, Member: IRole, Default: IRole} = {
	Owner: 'owner',
	Member: 'member',
	Default: 'default', // default user with no email when setting up instance
};

export const LOGIN_STATUS: {LoggedIn: ILogInStatus, LoggedOut: ILogInStatus} = {
	LoggedIn: 'LoggedIn', // Can be owner or member or default user
	LoggedOut: 'LoggedOut', // Can only be logged out if UM has been setup
};

export const PERMISSIONS: IUserPermissions = {
	TAGS: {
		CAN_DELETE_TAGS: {
			allow: {
				role: [ROLE.Owner, ROLE.Default],
			},
		},
	},
	PRIMARY_MENU: {
		CAN_ACCESS_USER_INFO: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedIn],
			},
			deny: {
				role: [ROLE.Default],
			},
		},
	},
	USER_SETTINGS: {
		VIEW_UM_SETUP_WARNING: {
			allow: {
				role: [ROLE.Default],
			},
		},
	},
};

/**
 * To be authorized, user must pass all deny rules and pass any of the allow rules.
 *
 * @param permissions
 * @param currentUser
 * @returns
 */
export const isAuthorized = (permissions: IPermissions, currentUser: IUser | null): boolean => {
	const loginStatus = currentUser ? LOGIN_STATUS.LoggedIn : LOGIN_STATUS.LoggedOut;
	// big AND block
	// if any of these are false, block user
	if (permissions.deny) {
		if (permissions.deny.shouldDeny && permissions.deny.shouldDeny()) {
			return false;
		}

		if (permissions.deny.loginStatus && permissions.deny.loginStatus.includes(loginStatus)) {
			return false;
		}

		if (currentUser && currentUser.globalRole) {
			const role = currentUser.isDefaultUser ? ROLE.Default : currentUser.globalRole.name;
			if (permissions.deny.role && permissions.deny.role.includes(role)) {
				return false;
			}
		}
		else if (permissions.deny.role) {
			return false;
		}
	}

	// big OR block
	// if any of these are true, allow user
	if (permissions.allow) {
		if (permissions.allow.shouldAllow && permissions.allow.shouldAllow()) {
			return true;
		}

		if (permissions.allow.loginStatus && permissions.allow.loginStatus.includes(loginStatus)) {
			return true;
		}

		if (currentUser && currentUser.globalRole) {
			const role = currentUser.isDefaultUser ? ROLE.Default : currentUser.globalRole.name;
			if (permissions.allow.role && permissions.allow.role.includes(role)) {
				return true;
			}
		}
	}

	return false;
};

export function getPersonalizedNodeTypes(answers: IPersonalizationSurveyAnswersV1 | IPersonalizationSurveyAnswersV2 | IPersonalizationSurveyAnswersV3 | null): string[] {
	if (!answers) {
		return [];
	}

	if (isPersonalizationV2OrV3(answers)) {
		return getPersonalizationV2(answers);
	}

	return getPersonalizationV1(answers);
}

export function getAccountAge(currentUser: IUser): number {
	if(currentUser.createdAt) {
		const accountCreatedAt = new Date(currentUser.createdAt);
		const today = new Date();

		return Math.ceil((today.getTime() - accountCreatedAt.getTime()) / (1000* 3600 * 24));
	}
	return -1;
}

function getPersonalizationV2(answers: IPersonalizationSurveyAnswersV2 | IPersonalizationSurveyAnswersV3) {
	let nodeTypes: string[] = [];

	const {version, ...data} = answers;
	if (Object.keys(data).length === 0) {
		return [];
	}

	const companySize = answers[COMPANY_SIZE_KEY];
	const companyType = answers[COMPANY_TYPE_KEY];
	const automationGoal = answers[AUTOMATION_GOAL_KEY];

	let codingSkill = null;
	if (CODING_SKILL_KEY in answers && answers[CODING_SKILL_KEY]) {
		codingSkill = parseInt(answers[CODING_SKILL_KEY] as string, 10);
		codingSkill = isNaN(codingSkill)? 0 : codingSkill;
	}

	// slot 1 trigger
	if (companyType === ECOMMERCE_COMPANY_TYPE) {
		nodeTypes = nodeTypes.concat(WOOCOMMERCE_TRIGGER_NODE_TYPE);
	} else if (companyType === MSP_COMPANY_TYPE) {
		nodeTypes = nodeTypes.concat(JIRA_TRIGGER_NODE_TYPE);
	} else if((companyType === PERSONAL_COMPANY_TYPE || automationGoal === OTHER_AUTOMATION_GOAL ||  automationGoal === NOT_SURE_YET_GOAL) && codingSkill !== null && codingSkill >= 4) {
		nodeTypes = nodeTypes.concat(WEBHOOK_NODE_TYPE);
	} else if((companyType === PERSONAL_COMPANY_TYPE || automationGoal === OTHER_AUTOMATION_GOAL ||  automationGoal === NOT_SURE_YET_GOAL) && codingSkill !== null && codingSkill < 3) {
		nodeTypes = nodeTypes.concat(CRON_NODE_TYPE);
	} else if (automationGoal === CUSTOMER_INTEGRATIONS_GOAL) {
		nodeTypes = nodeTypes.concat(WEBHOOK_NODE_TYPE);
	} else if (automationGoal === CUSTOMER_SUPPORT_GOAL || automationGoal === FINANCE_ACCOUNTING_GOAL) {
		nodeTypes = nodeTypes.concat(ZENDESK_TRIGGER_NODE_TYPE);
	} else if (automationGoal === SALES_MARKETING_GOAL) {
		nodeTypes = nodeTypes.concat(HUBSPOT_TRIGGER_NODE_TYPE);
	} else if (automationGoal === HR_GOAL) {
		nodeTypes = nodeTypes.concat(WORKABLE_TRIGGER_NODE_TYPE);
	} else if (automationGoal === OPERATIONS_GOAL) {
		nodeTypes = nodeTypes.concat(CRON_NODE_TYPE);
	} else if (automationGoal === PRODUCT_GOAL) {
		nodeTypes = nodeTypes.concat(NOTION_TRIGGER_NODE_TYPE);
	} else if (automationGoal === SECURITY_GOAL) {
		nodeTypes = nodeTypes.concat(THE_HIVE_TRIGGER_NODE_TYPE);
	} else {
		nodeTypes = nodeTypes.concat(WEBHOOK_NODE_TYPE);
	}

	// slot 2 data transformation
	if (codingSkill !== null && codingSkill >= 4) {
		nodeTypes = nodeTypes.concat(FUNCTION_NODE_TYPE);
	} else {
		nodeTypes = nodeTypes.concat(ITEM_LISTS_NODE_TYPE);
	}

	// slot 3 logic node
	if (codingSkill !== null && codingSkill < 3) {
		nodeTypes = nodeTypes.concat(IF_NODE_TYPE);
	}
	else {
		nodeTypes = nodeTypes.concat(SWITCH_NODE_TYPE);
	}

	// slot 4 usecase #1
	if (companySize === COMPANY_SIZE_500_999 || companySize === COMPANY_SIZE_1000_OR_MORE) {
		switch (automationGoal) {
			case CUSTOMER_INTEGRATIONS_GOAL:
				nodeTypes = nodeTypes.concat(HTTP_REQUEST_NODE_TYPE);
				break;
			case CUSTOMER_SUPPORT_GOAL:
				nodeTypes = nodeTypes.concat(ZENDESK_NODE_TYPE);
				break;
			case SALES_MARKETING_GOAL:
				nodeTypes = nodeTypes.concat(SALESFORCE_NODE_TYPE);
				break;
			case HR_GOAL:
				nodeTypes = nodeTypes.concat(SERVICENOW_NODE_TYPE);
				break;
			case PRODUCT_GOAL:
				nodeTypes = nodeTypes.concat(JIRA_NODE_TYPE);
				break;
			case FINANCE_ACCOUNTING_GOAL:
				nodeTypes = nodeTypes.concat(SPREADSHEET_FILE_NODE_TYPE);
				break;
			case SECURITY_GOAL:
				nodeTypes = nodeTypes.concat(ELASTIC_SECURITY_NODE_TYPE);
				break;
			default:
				nodeTypes = nodeTypes.concat(SLACK_NODE_TYPE);
		}
	} else {
		switch (automationGoal) {
			case CUSTOMER_INTEGRATIONS_GOAL:
				nodeTypes = nodeTypes.concat(HTTP_REQUEST_NODE_TYPE);
				break;
			case CUSTOMER_SUPPORT_GOAL:
				nodeTypes = nodeTypes.concat(ZENDESK_NODE_TYPE);
				break;
			case FINANCE_ACCOUNTING_GOAL:
				nodeTypes = nodeTypes.concat(QUICKBOOKS_NODE_TYPE);
				break;
			case HR_GOAL:
				nodeTypes = nodeTypes.concat(BAMBOO_HR_NODE_TYPE);
				break;
			case PRODUCT_GOAL:
				nodeTypes = nodeTypes.concat(JIRA_NODE_TYPE);
				break;
			case SALES_MARKETING_GOAL:
				nodeTypes = nodeTypes.concat(GOOGLE_SHEETS_NODE_TYPE);
				break;
			case SECURITY_GOAL:
				nodeTypes = nodeTypes.concat(ELASTIC_SECURITY_NODE_TYPE);
				break;
			default:
				nodeTypes = nodeTypes.concat(SLACK_NODE_TYPE);
		}
	}

	// slot 4
	nodeTypes = nodeTypes.concat(SET_NODE_TYPE);

	return nodeTypes;
}

function getPersonalizationV1(answers: IPersonalizationSurveyAnswersV1) {
	const companySize = answers[COMPANY_SIZE_KEY];
	const workArea = answers[WORK_AREA_KEY];

	function isWorkAreaAnswer(name: string) {
		if (Array.isArray(workArea)) {
			return workArea.includes(name);
		} else {
			return workArea === name;
		}
	}

	const workAreaIsEmpty = !workArea|| workArea.length === 0;

	if (companySize === null && workAreaIsEmpty && answers[CODING_SKILL_KEY] === null) {
		return [];
	}

	let codingSkill = null;
	if (answers[CODING_SKILL_KEY]) {
		codingSkill = parseInt(answers[CODING_SKILL_KEY] as string, 10);
		codingSkill = isNaN(codingSkill)? 0 : codingSkill;
	}

	let nodeTypes = [] as string[];
	if (isWorkAreaAnswer(IT_ENGINEERING_WORK_AREA)) {
		nodeTypes = nodeTypes.concat(WEBHOOK_NODE_TYPE);
	}
	else {
		nodeTypes = nodeTypes.concat(CRON_NODE_TYPE);
	}

	if (codingSkill !== null && codingSkill >= 4) {
		nodeTypes = nodeTypes.concat(FUNCTION_NODE_TYPE);
	}
	else {
		nodeTypes = nodeTypes.concat(ITEM_LISTS_NODE_TYPE);
	}

	if (codingSkill !== null && codingSkill < 3) {
		nodeTypes = nodeTypes.concat(IF_NODE_TYPE);
	}
	else {
		nodeTypes = nodeTypes.concat(SWITCH_NODE_TYPE);
	}

	if (companySize === COMPANY_SIZE_500_999 || companySize === COMPANY_SIZE_1000_OR_MORE) {
		if (isWorkAreaAnswer(SALES_BUSINESSDEV_WORK_AREA)) {
			nodeTypes = nodeTypes.concat(SALESFORCE_NODE_TYPE);
		}
		else if (isWorkAreaAnswer(SECURITY_WORK_AREA)) {
			nodeTypes = nodeTypes.concat([ELASTIC_SECURITY_NODE_TYPE, HTTP_REQUEST_NODE_TYPE]);
		}
		else if (isWorkAreaAnswer(PRODUCT_WORK_AREA)) {
			nodeTypes = nodeTypes.concat([JIRA_TRIGGER_NODE_TYPE, SEGMENT_NODE_TYPE]);
		}
		else if (isWorkAreaAnswer(IT_ENGINEERING_WORK_AREA)) {
			nodeTypes = nodeTypes.concat([GITHUB_TRIGGER_NODE_TYPE, HTTP_REQUEST_NODE_TYPE]);
		}
		else {
			nodeTypes = nodeTypes.concat([MICROSOFT_EXCEL_NODE_TYPE, MICROSOFT_TEAMS_NODE_TYPE]);
		}
	}
	else {
		if (isWorkAreaAnswer(SALES_BUSINESSDEV_WORK_AREA)) {
			nodeTypes = nodeTypes.concat(CLEARBIT_NODE_TYPE);
		}
		else if (isWorkAreaAnswer(SECURITY_WORK_AREA)) {
			nodeTypes = nodeTypes.concat([PAGERDUTY_NODE_TYPE, HTTP_REQUEST_NODE_TYPE]);
		}
		else if (isWorkAreaAnswer(PRODUCT_WORK_AREA)) {
			nodeTypes = nodeTypes.concat([JIRA_TRIGGER_NODE_TYPE, CALENDLY_TRIGGER_NODE_TYPE]);
		}
		else if (isWorkAreaAnswer(IT_ENGINEERING_WORK_AREA)) {
			nodeTypes = nodeTypes.concat([EXECUTE_COMMAND_NODE_TYPE, HTTP_REQUEST_NODE_TYPE]);
		}
		else if (isWorkAreaAnswer(FINANCE_WORK_AREA)) {
			nodeTypes = nodeTypes.concat([XERO_NODE_TYPE, QUICKBOOKS_NODE_TYPE, SPREADSHEET_FILE_NODE_TYPE]);
		}
		else {
			nodeTypes = nodeTypes.concat([EMAIL_SEND_NODE_TYPE, SLACK_NODE_TYPE]);
		}
	}

	nodeTypes = nodeTypes.concat(SET_NODE_TYPE);

	return nodeTypes;
}
