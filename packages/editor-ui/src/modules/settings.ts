import {  ActionContext, Module } from 'vuex';
import {
	IN8nUISettings,
	IPersonalizationSurveyAnswers,
	IRootState,
	ISettingsState,
} from '../Interface';
import { getSettings, submitPersonalizationSurvey } from '../api/settings';
import Vue from 'vue';
import { AUTOMATION_CONSULTING_WORK_AREA, CALENDLY_TRIGGER_NODE_TYPE, CLEARBIT_NODE_TYPE, COMPANY_SIZE_1000_OR_MORE, COMPANY_SIZE_500_999, CRON_NODE_TYPE, ELASTIC_SECURITY_NODE_TYPE, EMAIL_SEND_NODE_TYPE, EXECUTE_COMMAND_NODE_TYPE, FINANCE_PROCUREMENT_HR_WORK_AREA, FUNCTION_NODE_TYPE, GITHUB_TRIGGER_NODE_TYPE, HTTP_REQUEST_NODE_TYPE, IF_NODE_TYPE, ITEM_LISTS_NODE_TYPE, IT_ENGINEERING_WORK_AREA, JIRA_TRIGGER_NODE_TYPE, MICROSOFT_EXCEL_NODE_TYPE, MICROSOFT_TEAMS_NODE_TYPE, PERSONALIZATION_MODAL_KEY, PAGERDUTY_NODE_TYPE, PRODUCT_WORK_AREA, QUICKBOOKS_NODE_TYPE, SALESFORCE_NODE_TYPE, SALES_BUSINESSDEV_WORK_AREA, SECURITY_WORK_AREA, SEGMENT_NODE_TYPE, SET_NODE_TYPE, SLACK_NODE_TYPE, SPREADSHEET_FILE_NODE_TYPE, SWITCH_NODE_TYPE, WEBHOOK_NODE_TYPE, XERO_NODE_TYPE } from '@/constants';

const module: Module<ISettingsState, IRootState> = {
	namespaced: true,
	state: {
		settings: {} as IN8nUISettings,
	},
	getters: {
		personalizedNodeTypes(state: ISettingsState): string[] {
			const answers = state.settings.personalizationSurvey && state.settings.personalizationSurvey.answers;
			if (!answers) {
				return [];
			}

			return getPersonalizedNodeTypes(answers);
		},
	},
	mutations: {
		setSettings(state: ISettingsState, settings: IN8nUISettings) {
			state.settings = settings;
		},
		setPersonalizationAnswers(state: ISettingsState, answers: IPersonalizationSurveyAnswers) {
			Vue.set(state.settings, 'personalizationSurvey', {
				answers,
				shouldShow: false,
			});
		},
	},
	actions: {
		async getSettings(context: ActionContext<ISettingsState, IRootState>) {
			const settings = await getSettings(context.rootGetters.getRestApiContext);
			context.commit('setSettings', settings);

			// todo refactor to this store
			context.commit('setUrlBaseWebhook', settings.urlBaseWebhook, {root: true});
			context.commit('setEndpointWebhook', settings.endpointWebhook, {root: true});
			context.commit('setEndpointWebhookTest', settings.endpointWebhookTest, {root: true});
			context.commit('setSaveDataErrorExecution', settings.saveDataErrorExecution, {root: true});
			context.commit('setSaveDataSuccessExecution', settings.saveDataSuccessExecution, {root: true});
			context.commit('setSaveManualExecutions', settings.saveManualExecutions, {root: true});
			context.commit('setTimezone', settings.timezone, {root: true});
			context.commit('setExecutionTimeout', settings.executionTimeout, {root: true});
			context.commit('setMaxExecutionTimeout', settings.maxExecutionTimeout, {root: true});
			context.commit('setVersionCli', settings.versionCli, {root: true});
			context.commit('setInstanceId', settings.instanceId, {root: true});
			context.commit('setOauthCallbackUrls', settings.oauthCallbackUrls, {root: true});
			context.commit('setN8nMetadata', settings.n8nMetadata || {}, {root: true});
			context.commit('versions/setVersionNotificationSettings', settings.versionNotifications, {root: true});
			context.commit('setTelemetry', settings.telemetry, {root: true});

			const showPersonalizationsModal = settings.personalizationSurvey && settings.personalizationSurvey.shouldShow && !settings.personalizationSurvey.answers;
			if (showPersonalizationsModal) {
				context.commit('ui/openModal', PERSONALIZATION_MODAL_KEY, {root: true});
			}
			return settings;
		},
		async submitPersonalizationSurvey(context: ActionContext<ISettingsState, IRootState>, results: IPersonalizationSurveyAnswers) {
			await submitPersonalizationSurvey(context.rootGetters.getRestApiContext, results);

			context.commit('setPersonalizationAnswers', results);
		},
	},
};

function getPersonalizedNodeTypes(answers: IPersonalizationSurveyAnswers) {
	const { companySize, workArea } = answers;

	if (companySize === null && workArea === null && answers.codingSkill === null) {
		return [];
	}

	let codingSkill = null;
	if (answers.codingSkill) {
		codingSkill = parseInt(answers.codingSkill, 10);
		codingSkill = isNaN(codingSkill)? 0 : codingSkill;
	}

	let nodeTypes = [] as string[];
	if (workArea === IT_ENGINEERING_WORK_AREA || workArea === AUTOMATION_CONSULTING_WORK_AREA) {
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
		if (workArea === SALES_BUSINESSDEV_WORK_AREA) {
			nodeTypes = nodeTypes.concat(SALESFORCE_NODE_TYPE);
		}
		else if (workArea === SECURITY_WORK_AREA) {
			nodeTypes = nodeTypes.concat([ELASTIC_SECURITY_NODE_TYPE, HTTP_REQUEST_NODE_TYPE]);
		}
		else if (workArea === PRODUCT_WORK_AREA) {
			nodeTypes = nodeTypes.concat([JIRA_TRIGGER_NODE_TYPE, SEGMENT_NODE_TYPE]);
		}
		else if (workArea === IT_ENGINEERING_WORK_AREA) {
			nodeTypes = nodeTypes.concat([GITHUB_TRIGGER_NODE_TYPE, HTTP_REQUEST_NODE_TYPE]);
		}
		else {
			nodeTypes = nodeTypes.concat([MICROSOFT_EXCEL_NODE_TYPE, MICROSOFT_TEAMS_NODE_TYPE]);
		}
	}
	else {
		if (workArea === SALES_BUSINESSDEV_WORK_AREA) {
			nodeTypes = nodeTypes.concat(CLEARBIT_NODE_TYPE);
		}
		else if (workArea === SECURITY_WORK_AREA) {
			nodeTypes = nodeTypes.concat([PAGERDUTY_NODE_TYPE, HTTP_REQUEST_NODE_TYPE]);
		}
		else if (workArea === PRODUCT_WORK_AREA) {
			nodeTypes = nodeTypes.concat([JIRA_TRIGGER_NODE_TYPE, CALENDLY_TRIGGER_NODE_TYPE]);
		}
		else if (workArea === IT_ENGINEERING_WORK_AREA) {
			nodeTypes = nodeTypes.concat([EXECUTE_COMMAND_NODE_TYPE, HTTP_REQUEST_NODE_TYPE]);
		}
		else if (workArea === FINANCE_PROCUREMENT_HR_WORK_AREA) {
			nodeTypes = nodeTypes.concat([XERO_NODE_TYPE, QUICKBOOKS_NODE_TYPE, SPREADSHEET_FILE_NODE_TYPE]);
		}
		else {
			nodeTypes = nodeTypes.concat([EMAIL_SEND_NODE_TYPE, SLACK_NODE_TYPE]);
		}
	}

	nodeTypes = nodeTypes.concat(SET_NODE_TYPE);

	return nodeTypes;
}

export default module;
