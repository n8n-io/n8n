
import { CALENDLY_TRIGGER_NODE_TYPE, CLEARBIT_NODE_TYPE, COMPANY_SIZE_1000_OR_MORE, COMPANY_SIZE_500_999, CRON_NODE_TYPE, ELASTIC_SECURITY_NODE_TYPE, EMAIL_SEND_NODE_TYPE, EXECUTE_COMMAND_NODE_TYPE, FINANCE_WORK_AREA, FUNCTION_NODE_TYPE, GITHUB_TRIGGER_NODE_TYPE, HTTP_REQUEST_NODE_TYPE, IF_NODE_TYPE, ITEM_LISTS_NODE_TYPE, IT_ENGINEERING_WORK_AREA, JIRA_TRIGGER_NODE_TYPE, MICROSOFT_EXCEL_NODE_TYPE, MICROSOFT_TEAMS_NODE_TYPE, PERSONALIZATION_MODAL_KEY, PAGERDUTY_NODE_TYPE, PRODUCT_WORK_AREA, QUICKBOOKS_NODE_TYPE, SALESFORCE_NODE_TYPE, SALES_BUSINESSDEV_WORK_AREA, SECURITY_WORK_AREA, SEGMENT_NODE_TYPE, SET_NODE_TYPE, SLACK_NODE_TYPE, SPREADSHEET_FILE_NODE_TYPE, SWITCH_NODE_TYPE, WEBHOOK_NODE_TYPE, XERO_NODE_TYPE, COMPANY_SIZE_KEY, WORK_AREA_KEY, CODING_SKILL_KEY } from '@/constants';
import { IPermissions, IPersonalizationSurveyAnswers, IUser } from '@/Interface';

import { ILogInStatus, IRole, IUserPermissions } from "@/Interface";

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
	ROUTES: {
		ExecutionById: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedIn],
			},
		},
		NodeViewNew: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedIn],
			},
		},
		NodeViewExisting: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedIn],
			},
		},
		WorkflowTemplate: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedIn],
			},
		},
		SigninView: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedOut],
			},
		},
		SignupView: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedOut],
			},
		},
		SetupView: {
			allow: {
				role: [ROLE.Default],
			},
			deny: {
				um: false,
			},
		},
		ForgotMyPasswordView: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedOut],
			},
		},
		ChangePasswordView: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedOut],
			},
		},
		SettingsRedirect: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedIn],
			},
			deny: {
				um: false,
			},
		},
		UsersSettings: {
			allow: {
				role: [ROLE.Default, ROLE.Owner],
			},
			deny: {
				um: false,
			},
		},
		PersonalSettings: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedIn],
			},
			deny: {
				role: [ROLE.Default],
			},
		},
		NotFoundView: {
			allow: {
				loginStatus: [LOGIN_STATUS.LoggedIn, LOGIN_STATUS.LoggedOut],
			},
		},
	},
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


export const isAuthorized = (permissions: IPermissions, {currentUser, isUMEnabled}: {currentUser: IUser | null, isUMEnabled: boolean}): boolean => {
	const loginStatus = currentUser ? LOGIN_STATUS.LoggedIn : LOGIN_STATUS.LoggedOut;
	if (permissions.deny) {
		if (permissions.deny.um === isUMEnabled) {
			return false;
		}

		if (permissions.deny.loginStatus && permissions.deny.loginStatus.includes(loginStatus)) {
			return false;
		}

		if (currentUser && currentUser.globalRole) {
			const role = currentUser.isDefaultUser ? ROLE.Default: currentUser.globalRole.name;
			if (permissions.deny.role && permissions.deny.role.includes(role)) {
				return false;
			}
		}
		else if (permissions.deny.role) {
			return false;
		}
	}

	if (permissions.allow) {
		if (permissions.allow.um === isUMEnabled) {
			return true;
		}

		if (permissions.allow.loginStatus && permissions.allow.loginStatus.includes(loginStatus)) {
			return true;
		}

		if (currentUser && currentUser.globalRole) {
			const role = currentUser.isDefaultUser ? ROLE.Default: currentUser.globalRole.name;
			if (permissions.allow.role && permissions.allow.role.includes(role)) {
				return true;
			}
		}
	}

	return false;
};

export function getPersonalizedNodeTypes(answers: IPersonalizationSurveyAnswers) {
	const companySize = answers[COMPANY_SIZE_KEY];
	const workArea = answers[WORK_AREA_KEY];

	function isWorkAreaAnswer(name: string) {
		if (Array.isArray(workArea)) {
			return workArea.includes(name);
		} else {
			return workArea === name;
		}
	}

	const workAreaIsEmpty = workArea === null || workArea.length === 0;

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
