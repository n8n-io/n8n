<template>
	<Modal
		:name="PERSONALIZATION_MODAL_KEY"
		:title="
			!submitted
				? $locale.baseText('personalizationModal.customizeN8n')
				: $locale.baseText('personalizationModal.thanks')
		"
		:subtitle="!submitted ? $locale.baseText('personalizationModal.theseQuestionsHelpUs') : ''"
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
			<div v-if="submitted" :class="$style.submittedContainer">
				<img :class="$style.demoImage" :src="rootStore.baseUrl + 'suggestednodes.png'" />
				<n8n-text>{{ $locale.baseText('personalizationModal.lookOutForThingsMarked') }}</n8n-text>
			</div>
			<div :class="$style.container" v-else>
				<n8n-form-inputs :inputs="survey" :columnView="true" :eventBus="formBus" @submit="onSubmit"/>
			</div>
		</template>
		<template #footer>
			<div>
				<n8n-button
					v-if="submitted"
					@click="closeDialog"
					:label="$locale.baseText('personalizationModal.getStarted')"
					float="right"
				/>
				<n8n-button
					v-else
					@click="onSave"
					:loading="isSaving"
					:label="$locale.baseText('personalizationModal.continue')"
					float="right"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

const SURVEY_VERSION = 'v3';

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
	AUTOMATION_GOAL_KEY,
	CUSTOMER_INTEGRATIONS_GOAL,
	CUSTOMER_SUPPORT_GOAL,
	ENGINEERING_GOAL,
	FINANCE_ACCOUNTING_GOAL,
	HR_GOAL,
	OPERATIONS_GOAL,
	PRODUCT_GOAL,
	SALES_MARKETING_GOAL,
	SECURITY_GOAL,
	OTHER_AUTOMATION_GOAL,
	NOT_SURE_YET_GOAL,
	AUTOMATION_GOAL_OTHER_KEY,
	COMPANY_TYPE_KEY,
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
	USAGE_MODE_KEY,
	USAGE_MODE_MANIPULATE_FILES,
	USAGE_MODE_BUILD_BE_SERVICES,
	USAGE_MODE_CONNECT_TO_DB,
} from '../constants';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import Modal from './Modal.vue';
import { IFormInputs, IPersonalizationLatestVersion, IPersonalizationSurveyAnswersV3, IUser } from '@/Interface';
import Vue from 'vue';
import { getAccountAge } from '@/stores/userHelpers';
import { GenericValue } from 'n8n-workflow';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useRootStore } from '@/stores/n8nRootStore';
import { useUsersStore } from '@/stores/users';

export default mixins(showMessage, workflowHelpers).extend({
	components: { Modal },
	name: 'PersonalizationModal',
	data() {
		return {
			submitted: false,
			isSaving: false,
			PERSONALIZATION_MODAL_KEY,
			otherWorkAreaFieldVisible: false,
			otherCompanyIndustryFieldVisible: false,
			showAllIndustryQuestions: true,
			modalBus: new Vue(),
			formBus: new Vue(),
		};
	},
	computed: {
		...mapStores(
			useRootStore,
			useSettingsStore,
			useUIStore,
			useUsersStore,
		),
		survey() {
			const survey: IFormInputs = [
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
						const companyIndustry = (values as IPersonalizationLatestVersion)[COMPANY_INDUSTRY_EXTENDED_KEY];
						return companyType === OTHER_COMPANY_TYPE && !!companyIndustry && companyIndustry.includes(OTHER_INDUSTRY_OPTION);
					},
				},
				{
					name: AUTOMATION_GOAL_KEY,
					properties: {
						type: 'select',
						label: this.$locale.baseText('personalizationModal.whatAreYouLookingToAutomate'),
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								value: CUSTOMER_INTEGRATIONS_GOAL,
								label: this.$locale.baseText('personalizationModal.customerIntegrations'),
							},
							{
								value: CUSTOMER_SUPPORT_GOAL,
								label: this.$locale.baseText('personalizationModal.customerSupport'),
							},
							{
								value: ENGINEERING_GOAL,
								label: this.$locale.baseText('personalizationModal.engineeringOrDevops'),
							},
							{
								value: FINANCE_ACCOUNTING_GOAL,
								label: this.$locale.baseText('personalizationModal.financeOrAccounting'),
							},
							{
								value: HR_GOAL,
								label: this.$locale.baseText('personalizationModal.hr'),
							},
							{
								value: OPERATIONS_GOAL,
								label: this.$locale.baseText('personalizationModal.operations'),
							},
							{
								value: PRODUCT_GOAL,
								label: this.$locale.baseText('personalizationModal.product'),
							},
							{
								value: SALES_MARKETING_GOAL,
								label: this.$locale.baseText('personalizationModal.salesAndMarketing'),
							},
							{
								value: SECURITY_GOAL,
								label: this.$locale.baseText('personalizationModal.security'),
							},
							{
								value: OTHER_AUTOMATION_GOAL,
								label: this.$locale.baseText('personalizationModal.otherPleaseSpecify'),
							},
							{
								value: NOT_SURE_YET_GOAL,
								label: this.$locale.baseText('personalizationModal.notSureYet'),
							},
						],
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						return companyType !== PERSONAL_COMPANY_TYPE;
					},
				},
				{
					name: AUTOMATION_GOAL_OTHER_KEY,
					properties: {
						placeholder: this.$locale.baseText('personalizationModal.specifyYourAutomationGoal'),
					},
					shouldDisplay(values): boolean {
						const companyType = (values as IPersonalizationLatestVersion)[COMPANY_TYPE_KEY];
						const automationGoal = (values as IPersonalizationLatestVersion)[AUTOMATION_GOAL_KEY];
						return companyType !== PERSONAL_COMPANY_TYPE && automationGoal === OTHER_AUTOMATION_GOAL;
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
						const goal = (values as IPersonalizationLatestVersion)[AUTOMATION_GOAL_KEY];
						return goal === SALES_MARKETING_GOAL;
					},
				},
				{
					name: OTHER_MARKETING_AUTOMATION_GOAL_KEY,
					properties: {
						placeholder: this.$locale.baseText('personalizationModal.specifyOtherSalesAndMarketingGoal'),
					},
					shouldDisplay(values): boolean {
						const goals = (values as IPersonalizationLatestVersion)[MARKETING_AUTOMATION_GOAL_KEY];
						return !!goals && goals.includes(MARKETING_AUTOMATION_OTHER);
					},
				},
				{
					name: USAGE_MODE_KEY,
					properties: {
						type: 'multi-select',
						label: this.$locale.baseText('personalizationModal.specifyUsageMode'),
						placeholder: this.$locale.baseText('personalizationModal.select'),
						options: [
							{
								label: this.$locale.baseText('personalizationModal.connectToInternalDB'),
								value: USAGE_MODE_CONNECT_TO_DB,
							},
							{
								label: this.$locale.baseText('personalizationModal.buildBackendServices'),
								value: USAGE_MODE_BUILD_BE_SERVICES,
							},
							{
								label: this.$locale.baseText('personalizationModal.manipulateFiles'),
								value: USAGE_MODE_MANIPULATE_FILES,
							},
						],
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
			];

			return survey;
		},
	},
	methods: {
		closeDialog() {
			this.modalBus.$emit('close');
		},
		onSave() {
			this.formBus.$emit('submit');
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

				await this.usersStore.submitPersonalizationSurvey(survey as IPersonalizationSurveyAnswersV3);

				if (Object.keys(values).length === 0) {
					this.closeDialog();
				}

				await this.fetchOnboardingPrompt();
				this.submitted = true;
			} catch (e) {
				this.$showError(e, 'Error while submitting results');
			}

			this.$data.isSaving = false;
		},
		async fetchOnboardingPrompt() {
			if (this.settingsStore.onboardingCallPromptEnabled && getAccountAge(this.usersStore.currentUser || {} as IUser) <= ONBOARDING_PROMPT_TIMEBOX) {
				const onboardingResponse = await this.uiStore.getNextOnboardingPrompt();
				const promptTimeout = onboardingResponse.toast_sequence_number === 1 ? FIRST_ONBOARDING_PROMPT_TIMEOUT : 1000;

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

.submittedContainer {
	* {
		margin-bottom: var(--spacing-2xs);
	}
}

.demoImage {
	border-radius: var(--border-radius-large);
	border: var(--border-base);
	width: 100%;
	height: 140px;
}
</style>
