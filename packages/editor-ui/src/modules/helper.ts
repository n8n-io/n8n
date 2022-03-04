
import { CALENDLY_TRIGGER_NODE_TYPE, CLEARBIT_NODE_TYPE, COMPANY_SIZE_1000_OR_MORE, COMPANY_SIZE_500_999, CRON_NODE_TYPE, ELASTIC_SECURITY_NODE_TYPE, EMAIL_SEND_NODE_TYPE, EXECUTE_COMMAND_NODE_TYPE, FINANCE_WORK_AREA, FUNCTION_NODE_TYPE, GITHUB_TRIGGER_NODE_TYPE, HTTP_REQUEST_NODE_TYPE, IF_NODE_TYPE, ITEM_LISTS_NODE_TYPE, IT_ENGINEERING_WORK_AREA, JIRA_TRIGGER_NODE_TYPE, MICROSOFT_EXCEL_NODE_TYPE, MICROSOFT_TEAMS_NODE_TYPE, PERSONALIZATION_MODAL_KEY, PAGERDUTY_NODE_TYPE, PRODUCT_WORK_AREA, QUICKBOOKS_NODE_TYPE, SALESFORCE_NODE_TYPE, SALES_BUSINESSDEV_WORK_AREA, SECURITY_WORK_AREA, SEGMENT_NODE_TYPE, SET_NODE_TYPE, SLACK_NODE_TYPE, SPREADSHEET_FILE_NODE_TYPE, SWITCH_NODE_TYPE, WEBHOOK_NODE_TYPE, XERO_NODE_TYPE, COMPANY_SIZE_KEY, WORK_AREA_KEY, CODING_SKILL_KEY } from '@/constants';
import { IPersonalizationSurveyAnswers } from '@/Interface';

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
