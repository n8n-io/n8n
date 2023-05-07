<template>
	<Modal
		:name="PERSONALIZATION_MODAL_KEY"
		:title="$locale.baseText('personalizationModal.customizeN8n')"
		:subtitle="$locale.baseText('personalizationModal.theseQuestionsHelpUs')"
		:centerTitle="true"
		:showClose="false"
		:eventBus="modalBus"
		:closeOnClickModal="false"
		:closeOnPressEscape="false"
		width="460px"
		data-test-id="personalization-form"
		@enter="onSave"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-form-inputs
					:inputs="survey"
					:columnView="true"
					:eventBus="formBus"
					@submit="onSubmit"
				/>
			</div>
		</template>
		<template #footer>
			<div>
				<n8n-button
					@click="onSave"
					:loading="isSaving"
					:label="$locale.baseText('personalizationModal.getStarted')"
					float="right"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

const SURVEY_VERSION = 'v4';

import {
	COMPANY_SIZE_100_499,
	COMPANY_SIZE_1000_OR_MORE,
	COMPANY_SIZE_20_OR_LESS,
	COMPANY_SIZE_20_99,
	COMPANY_SIZE_500_999,
	COMPANY_SIZE_KEY,
	COMPANY_SIZE_PERSONAL_USE,
	GOVERNMENT_INDUSTRY,
	HEALTHCARE_INDUSTRY,
	LEGAL_INDUSTRY,
	OTHER_INDUSTRY_OPTION,
	PERSONALIZATION_MODAL_KEY,
	SECURITY_INDUSTRY,
	EDUCATION_TYPE,
	FINANCE_INSURANCE_INDUSTRY,
	IT_INDUSTRY,
	MARKETING_INDUSTRY,
	MEDIA_INDUSTRY,
	MANUFACTURING_INDUSTRY,
	PHYSICAL_RETAIL_OR_SERVICES,
	REAL_ESTATE_OR_CONSTRUCTION,
	TELECOMS_INDUSTRY,
	OTHER_AUTOMATION_GOAL,
	COMPANY_TYPE_KEY,
	EMAIL_KEY,
	SAAS_COMPANY_TYPE,
	ECOMMERCE_COMPANY_TYPE,
	MSP_INDUSTRY,
	DIGITAL_AGENCY_COMPANY_TYPE,
	SYSTEMS_INTEGRATOR_COMPANY_TYPE,
	OTHER_COMPANY_TYPE,
	PERSONAL_COMPANY_TYPE,
	COMPANY_INDUSTRY_EXTENDED_KEY,
	OTHER_COMPANY_INDUSTRY_EXTENDED_KEY,
	ONBOARDING_PROMPT_TIMEBOX,
	FIRST_ONBOARDING_PROMPT_TIMEOUT,
	ONBOARDING_CALL_SIGNUP_MODAL_KEY,
	MARKETING_AUTOMATION_GOAL_KEY,
	MARKETING_AUTOMATION_LEAD_GENERATION_GOAL,
	MARKETING_AUTOMATION_CUSTOMER_COMMUNICATION,
	MARKETING_AUTOMATION_ACTIONS,
	MARKETING_AUTOMATION_AD_CAMPAIGN,
	MARKETING_AUTOMATION_REPORTING,
	MARKETING_AUTOMATION_DATA_SYNCHING,
	MARKETING_AUTOMATION_OTHER,
	OTHER_MARKETING_AUTOMATION_GOAL_KEY,
	ROLE_KEY,
	ROLE_BUSINESS_OWNER,
	ROLE_CUSTOMER_SUPPORT,
	ROLE_ENGINEERING,
	ROLE_DATA_SCIENCE,
	ROLE_DEVOPS,
	ROLE_IT,
	ROLE_SALES_AND_MARKETING,
	ROLE_SECURITY,
	ROLE_OTHER,
	ROLE_OTHER_KEY,
	DEVOPS_AUTOMATION_GOAL_OTHER_KEY,
	DEVOPS_AUTOMATION_GOAL_KEY,
	DEVOPS_AUTOMATION_OTHER,
	DEVOPS_AUTOMATION_CI_CD_GOAL,
	DEVOPS_AUTOMATION_CLOUD_INFRASTRUCTURE_ORCHESTRATION_GOAL,
	DEVOPS_AUTOMATION_DATA_SYNCING_GOAL,
	DEVOPS_INCIDENT_RESPONSE_GOAL,
	DEVOPS_MONITORING_AND_ALERTING_GOAL,
	DEVOPS_REPORTING_GOAL,
	DEVOPS_TICKETING_SYSTEMS_INTEGRATIONS_GOAL,
	AUTOMATION_BENEFICIARY_KEY,
	AUTOMATION_BENEFICIARY_SELF,
	AUTOMATION_BENEFICIARY_MY_TEAM,
	AUTOMATION_BENEFICIARY_OTHER_TEAMS,
	REPORTED_SOURCE_KEY,
	REPORTED_SOURCE_GOOGLE,
	REPORTED_SOURCE_TWITTER,
	REPORTED_SOURCE_LINKEDIN,
	REPORTED_SOURCE_YOUTUBE,
	REPORTED_SOURCE_FRIEND,
	REPORTED_SOURCE_PODCAST,
	REPORTED_SOURCE_EVENT,
	REPORTED_SOURCE_OTHER,
	REPORTED_SOURCE_OTHER_KEY,
	VIEWS,
} from '@/constants';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { showMessage } from '@/mixins/showMessage';
import Modal from './Modal.vue';
import type { IFormInputs, IPersonalizationLatestVersion, IUser } from '@/Interface';
import { getAccountAge } from '@/utils';
import type { GenericValue } from 'n8n-workflow';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useUsersStore } from '@/stores/users.store';
import { createEventBus } from '@/event-bus';

export default mixins(showMessage, workflowHelpers).extend({
	components: { Modal },
	name: 'PersonalizationModal',
	data() {
		return {
			isSaving: false,
			PERSONALIZATION_MODAL_KEY,
			otherWorkAreaFieldVisible: false,
			otherCompanyIndustryFieldVisible: false,
			showAllIndustryQuestions: true,
			modalBus: createEventBus(),
			formBus: createEventBus(),
		};
	},
	computed: {
		...mapStores(useRootStore, useSettingsStore, useUIStore, useUsersStore),
		survey() {
			const survey: IFormInputs = [
				{
					name: EMAIL_KEY,
					properties: {
						label: this.$locale.baseText('personalizationModal.yourEmailAddress'),
						type: 'text',
						placeholder: this.$locale.baseText('personalizationModal.email'),
					},
					shouldDisplay: () =>
						this.settingsStore.isDesktopDeployment && !this.usersStore.currentUser?.firstName,
				},
				{
					name: COMPANY_TYPE_KEY,
					properties: {
						label: this.$locale.baseText('personalizationModal.whatBestDescribesYourCompany'),
						type: 'select',
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								label: this.$locale.baseText('personalizationModal.saas'),
								value: SAAS_COMPANY_TYPE,
							},
							{
								label: this.$locale.baseText('personalizationModal.eCommerce'),
								value: ECOMMERCE_COMPANY_TYPE,
							},

							{
								label: this.$locale.baseText('personalizationModal.digitalAgencyOrConsultant'),
								value: DIGITAL_AGENCY_COMPANY_TYPE,
							},
							{
								label: this.$locale.baseText('personalizationModal.systemsIntegrator'),
								value: SYSTEMS_INTEGRATOR_COMPANY_TYPE,
							},
							{
								value: EDUCATION_TYPE,
								label: this.$locale.baseText('personalizationModal.education'),
							},
							{
								label: this.$locale.baseText('personalizationModal.other'),
								value: OTHER_COMPANY_TYPE,
							},
							{
								label: this.$locale.baseText('personalizationModal.imNotUsingN8nForWork'),
								value: PERSONAL_COMPANY_TYPE,
							},
						],
					},
				},
				{
					name: COMPANY_INDUSTRY_EXTENDED_KEY,
					properties: {
						type: 'multi-select',
						label: this.$locale.baseText('personalizationModal.whichIndustriesIsYourCompanyIn'),
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								value: FINANCE_INSURANCE_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.financeOrInsurance'),
							},
							{
								value: GOVERNMENT_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.government'),
							},
							{
								value: HEALTHCARE_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.healthcare'),
							},
							{
								value: IT_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.it'),
							},
							{
								value: LEGAL_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.legal'),
							},
							{
								value: MSP_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.managedServiceProvider'),
							},
							{
								value: MARKETING_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.marketing'),
							},
							{
								value: MEDIA_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.media'),
							},
							{
								value: MANUFACTURING_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.manufacturing'),
							},
							{
								value: PHYSICAL_RETAIL_OR_SERVICES,
								label: this.$locale.baseText('personalizationModal.physicalRetailOrServices'),
							},
							{
								value: REAL_ESTATE_OR_CONSTRUCTION,
								label: this.$locale.baseText('personalizationModal.realEstateOrConstruction'),
							},
							{
								value: SECURITY_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.security'),
							},
							{
								value: TELECOMS_INDUSTRY,
								label: this.$locale.baseText('personalizationModal.telecoms'),
							},
							{
								value: OTHER_INDUSTRY_OPTION,
								label: this.$locale.baseText('personalizationModal.otherPleaseSpecify'),
							},
						],
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						return companyType === OTHER_COMPANY_TYPE;
					},
				},
				{
					name: OTHER_COMPANY_INDUSTRY_EXTENDED_KEY,
					properties: {
						placeholder: this.$locale.baseText('personalizationModal.specifyYourCompanysIndustry'),
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						const companyIndustry = (values as IPersonalizationLatestVersion)[
							COMPANY_INDUSTRY_EXTENDED_KEY
						];
						return (
							companyType === OTHER_COMPANY_TYPE &&
							!!companyIndustry &&
							companyIndustry.includes(OTHER_INDUSTRY_OPTION)
						);
					},
				},
				{
					name: ROLE_KEY,
					properties: {
						type: 'select',
						label: this.$locale.baseText('personalizationModal.whichRoleBestDescribesYou'),
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								value: ROLE_BUSINESS_OWNER,
								label: this.$locale.baseText('personalizationModal.businessOwner'),
							},
							{
								value: ROLE_CUSTOMER_SUPPORT,
								label: this.$locale.baseText('personalizationModal.customerSupport'),
							},
							{
								value: ROLE_DATA_SCIENCE,
								label: this.$locale.baseText('personalizationModal.dataScience'),
							},
							{
								value: ROLE_DEVOPS,
								label: this.$locale.baseText('personalizationModal.devops'),
							},
							{
								value: ROLE_IT,
								label: this.$locale.baseText('personalizationModal.it'),
							},
							{
								value: ROLE_ENGINEERING,
								label: this.$locale.baseText('personalizationModal.engineering'),
							},
							{
								value: ROLE_SALES_AND_MARKETING,
								label: this.$locale.baseText('personalizationModal.salesAndMarketing'),
							},
							{
								value: ROLE_SECURITY,
								label: this.$locale.baseText('personalizationModal.security'),
							},
							{
								value: ROLE_OTHER,
								label: this.$locale.baseText('personalizationModal.otherPleaseSpecify'),
							},
						],
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						return companyType !== PERSONAL_COMPANY_TYPE;
					},
				},
				{
					name: ROLE_OTHER_KEY,
					properties: {
						placeholder: this.$locale.baseText('personalizationModal.specifyYourRole'),
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						const role = (values as IPersonalizationLatestVersion)[ROLE_KEY];
						return companyType !== PERSONAL_COMPANY_TYPE && role === ROLE_OTHER;
					},
				},
				{
					name: DEVOPS_AUTOMATION_GOAL_KEY,
					properties: {
						type: 'multi-select',
						label: this.$locale.baseText('personalizationModal.whatAreYouLookingToAutomate'),
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								value: DEVOPS_AUTOMATION_CI_CD_GOAL,
								label: this.$locale.baseText('personalizationModal.cicd'),
							},
							{
								value: DEVOPS_AUTOMATION_CLOUD_INFRASTRUCTURE_ORCHESTRATION_GOAL,
								label: this.$locale.baseText(
									'personalizationModal.cloudInfrastructureOrchestration',
								),
							},
							{
								value: DEVOPS_AUTOMATION_DATA_SYNCING_GOAL,
								label: this.$locale.baseText('personalizationModal.dataSynching'),
							},
							{
								value: DEVOPS_INCIDENT_RESPONSE_GOAL,
								label: this.$locale.baseText('personalizationModal.incidentResponse'),
							},
							{
								value: DEVOPS_MONITORING_AND_ALERTING_GOAL,
								label: this.$locale.baseText('personalizationModal.monitoringAndAlerting'),
							},
							{
								value: DEVOPS_REPORTING_GOAL,
								label: this.$locale.baseText('personalizationModal.reporting'),
							},
							{
								value: DEVOPS_TICKETING_SYSTEMS_INTEGRATIONS_GOAL,
								label: this.$locale.baseText('personalizationModal.ticketingSystemsIntegrations'),
							},
							{
								value: OTHER_AUTOMATION_GOAL,
								label: this.$locale.baseText('personalizationModal.other'),
							},
						],
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						const role = (values as IPersonalizationLatestVersion)[ROLE_KEY] as string;
						return (
							companyType !== PERSONAL_COMPANY_TYPE &&
							[ROLE_DEVOPS, ROLE_ENGINEERING, ROLE_IT].includes(role)
						);
					},
				},
				{
					name: DEVOPS_AUTOMATION_GOAL_OTHER_KEY,
					properties: {
						placeholder: this.$locale.baseText('personalizationModal.specifyYourAutomationGoal'),
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						const goals = (values as IPersonalizationLatestVersion)[DEVOPS_AUTOMATION_GOAL_KEY];
						const role = (values as IPersonalizationLatestVersion)[ROLE_KEY] as string;
						return (
							companyType !== PERSONAL_COMPANY_TYPE &&
							[ROLE_DEVOPS, ROLE_ENGINEERING, ROLE_IT].includes(role) &&
							!!goals &&
							goals.includes(DEVOPS_AUTOMATION_OTHER)
						);
					},
				},
				{
					name: MARKETING_AUTOMATION_GOAL_KEY,
					properties: {
						type: 'multi-select',
						label: this.$locale.baseText('personalizationModal.specifySalesMarketingGoal'),
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								label: this.$locale.baseText('personalizationModal.leadGeneration'),
								value: MARKETING_AUTOMATION_LEAD_GENERATION_GOAL,
							},
							{
								label: this.$locale.baseText('personalizationModal.customerCommunication'),
								value: MARKETING_AUTOMATION_CUSTOMER_COMMUNICATION,
							},
							{
								label: this.$locale.baseText('personalizationModal.customerActions'),
								value: MARKETING_AUTOMATION_ACTIONS,
							},
							{
								label: this.$locale.baseText('personalizationModal.adCampaign'),
								value: MARKETING_AUTOMATION_AD_CAMPAIGN,
							},
							{
								label: this.$locale.baseText('personalizationModal.reporting'),
								value: MARKETING_AUTOMATION_REPORTING,
							},
							{
								label: this.$locale.baseText('personalizationModal.dataSynching'),
								value: MARKETING_AUTOMATION_DATA_SYNCHING,
							},
							{
								label: this.$locale.baseText('personalizationModal.other'),
								value: MARKETING_AUTOMATION_OTHER,
							},
						],
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						const role = (values as IPersonalizationLatestVersion)[ROLE_KEY];
						return companyType !== PERSONAL_COMPANY_TYPE && role === ROLE_SALES_AND_MARKETING;
					},
				},
				{
					name: OTHER_MARKETING_AUTOMATION_GOAL_KEY,
					properties: {
						placeholder: this.$locale.baseText(
							'personalizationModal.specifyOtherSalesAndMarketingGoal',
						),
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						const goals = (values as IPersonalizationLatestVersion)[MARKETING_AUTOMATION_GOAL_KEY];
						const role = (values as IPersonalizationLatestVersion)[ROLE_KEY];
						return (
							companyType !== PERSONAL_COMPANY_TYPE &&
							role === ROLE_SALES_AND_MARKETING &&
							!!goals &&
							goals.includes(MARKETING_AUTOMATION_OTHER)
						);
					},
				},
				{
					name: AUTOMATION_BENEFICIARY_KEY,
					properties: {
						type: 'select',
						label: this.$locale.baseText('personalizationModal.specifyAutomationBeneficiary'),
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								label: this.$locale.baseText('personalizationModal.myself'),
								value: AUTOMATION_BENEFICIARY_SELF,
							},
							{
								label: this.$locale.baseText('personalizationModal.myTeam'),
								value: AUTOMATION_BENEFICIARY_MY_TEAM,
							},
							{
								label: this.$locale.baseText('personalizationModal.otherTeams'),
								value: AUTOMATION_BENEFICIARY_OTHER_TEAMS,
							},
						],
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						return companyType !== PERSONAL_COMPANY_TYPE;
					},
				},
				{
					name: COMPANY_SIZE_KEY,
					properties: {
						type: 'select',
						label: this.$locale.baseText('personalizationModal.howBigIsYourCompany'),
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								label: this.$locale.baseText('personalizationModal.lessThan20People'),
								value: COMPANY_SIZE_20_OR_LESS,
							},
							{
								label: `20-99 ${this.$locale.baseText('personalizationModal.people')}`,
								value: COMPANY_SIZE_20_99,
							},
							{
								label: `100-499 ${this.$locale.baseText('personalizationModal.people')}`,
								value: COMPANY_SIZE_100_499,
							},
							{
								label: `500-999 ${this.$locale.baseText('personalizationModal.people')}`,
								value: COMPANY_SIZE_500_999,
							},
							{
								label: `1000+ ${this.$locale.baseText('personalizationModal.people')}`,
								value: COMPANY_SIZE_1000_OR_MORE,
							},
							{
								label: this.$locale.baseText('personalizationModal.imNotUsingN8nForWork'),
								value: COMPANY_SIZE_PERSONAL_USE,
							},
						],
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						return companyType !== PERSONAL_COMPANY_TYPE;
					},
				},
				{
					name: REPORTED_SOURCE_KEY,
					properties: {
						type: 'select',
						label: this.$locale.baseText('personalizationModal.howDidYouHearAboutN8n'),
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								label: 'Google',
								value: REPORTED_SOURCE_GOOGLE,
							},
							{
								label: 'Twitter',
								value: REPORTED_SOURCE_TWITTER,
							},
							{
								label: 'LinkedIn',
								value: REPORTED_SOURCE_LINKEDIN,
							},
							{
								label: 'YouTube',
								value: REPORTED_SOURCE_YOUTUBE,
							},
							{
								label: this.$locale.baseText('personalizationModal.friendWordOfMouth'),
								value: REPORTED_SOURCE_FRIEND,
							},
							{
								label: this.$locale.baseText('personalizationModal.podcast'),
								value: REPORTED_SOURCE_PODCAST,
							},
							{
								label: this.$locale.baseText('personalizationModal.event'),
								value: REPORTED_SOURCE_EVENT,
							},
							{
								label: this.$locale.baseText('personalizationModal.otherPleaseSpecify'),
								value: REPORTED_SOURCE_OTHER,
							},
						],
					},
				},
				{
					name: REPORTED_SOURCE_OTHER_KEY,
					properties: {
						placeholder: this.$locale.baseText('personalizationModal.specifyReportedSource'),
					},
					shouldDisplay(values): boolean {
						const reportedSource = (values as IPersonalizationLatestVersion)[REPORTED_SOURCE_KEY];
						return reportedSource === REPORTED_SOURCE_OTHER;
					},
				},
			];

			return survey;
		},
	},
	methods: {
		closeDialog() {
			this.modalBus.emit('close');
			// In case the redirect to canvas for new users didn't happen
			// we try again after closing the modal
			if (this.$route.name !== VIEWS.NEW_WORKFLOW) {
				this.$router.replace({ name: VIEWS.NEW_WORKFLOW });
			}
		},
		onSave() {
			this.formBus.emit('submit');
		},
		async onSubmit(values: IPersonalizationLatestVersion): Promise<void> {
			this.$data.isSaving = true;

			try {
				const survey: Record<string, GenericValue> = {
					...values,
					version: SURVEY_VERSION,
					personalization_survey_submitted_at: new Date().toISOString(),
					personalization_survey_n8n_version: this.rootStore.versionCli,
				};

				this.$externalHooks().run('personalizationModal.onSubmit', survey);

				await this.usersStore.submitPersonalizationSurvey(survey as IPersonalizationLatestVersion);

				if (Object.keys(values).length === 0) {
					this.closeDialog();
				}

				await this.fetchOnboardingPrompt();
			} catch (e) {
				this.$showError(e, 'Error while submitting results');
			}

			this.$data.isSaving = false;
			this.closeDialog();
		},
		async fetchOnboardingPrompt() {
			if (
				this.settingsStore.onboardingCallPromptEnabled &&
				getAccountAge(this.usersStore.currentUser || ({} as IUser)) <= ONBOARDING_PROMPT_TIMEBOX
			) {
				const onboardingResponse = await this.uiStore.getNextOnboardingPrompt();
				const promptTimeout =
					onboardingResponse.toast_sequence_number === 1 ? FIRST_ONBOARDING_PROMPT_TIMEOUT : 1000;

				if (onboardingResponse.title && onboardingResponse.description) {
					setTimeout(async () => {
						this.$showToast({
							type: 'info',
							title: onboardingResponse.title,
							message: onboardingResponse.description,
							duration: 0,
							customClass: 'clickable',
							closeOnClick: true,
							onClick: () => {
								this.$telemetry.track('user clicked onboarding toast', {
									seq_num: onboardingResponse.toast_sequence_number,
									title: onboardingResponse.title,
									description: onboardingResponse.description,
								});
								this.uiStore.openModal(ONBOARDING_CALL_SIGNUP_MODAL_KEY);
							},
						});
					}, promptTimeout);
				}
			}
		},
	},
});
</script>

<style lang="scss" module>
.container {
	> div,
	section > div:not(:last-child) {
		margin-bottom: var(--spacing-m);
	}
}
</style>
