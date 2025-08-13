<script lang="ts" setup>
import { computed, ref } from 'vue';
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
	SAAS_COMPANY_TYPE,
	ECOMMERCE_COMPANY_TYPE,
	MSP_INDUSTRY,
	DIGITAL_AGENCY_COMPANY_TYPE,
	SYSTEMS_INTEGRATOR_COMPANY_TYPE,
	OTHER_COMPANY_TYPE,
	PERSONAL_COMPANY_TYPE,
	COMPANY_INDUSTRY_EXTENDED_KEY,
	OTHER_COMPANY_INDUSTRY_EXTENDED_KEY,
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
	COMMUNITY_PLUS_ENROLLMENT_MODAL,
} from '@/constants';
import { useToast } from '@/composables/useToast';
import Modal from '@/components/Modal.vue';
import type { IFormInputs } from '@/Interface';
import type { IPersonalizationLatestVersion } from '@n8n/rest-api-client/api/users';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/stores/users.store';
import { createFormEventBus } from '@n8n/design-system/utils';
import { createEventBus } from '@n8n/utils/event-bus';
import { usePostHog } from '@/stores/posthog.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@n8n/i18n';
import { useRoute, useRouter } from 'vue-router';
import { useUIStore } from '@/stores/ui.store';
import { getResourcePermissions } from '@n8n/permissions';

const SURVEY_VERSION = 'v4';

const externalHooks = useExternalHooks();
const modalBus = createEventBus();
const formBus = createFormEventBus();
const { showError } = useToast();
const i18n = useI18n();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const posthogStore = usePostHog();
const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();

const formValues = ref<Record<string, string>>({});
const isSaving = ref(false);
const userPermissions = computed(() =>
	getResourcePermissions(usersStore.currentUser?.globalScopes),
);
const survey = computed<IFormInputs>(
	() =>
		[
			{
				name: COMPANY_TYPE_KEY,
				properties: {
					label: i18n.baseText('personalizationModal.whatBestDescribesYourCompany'),
					type: 'select',
					placeholder: i18n.baseText('personalizationModal.select'),
					options: [
						{
							label: i18n.baseText('personalizationModal.saas'),
							value: SAAS_COMPANY_TYPE,
						},
						{
							label: i18n.baseText('personalizationModal.eCommerce'),
							value: ECOMMERCE_COMPANY_TYPE,
						},

						{
							label: i18n.baseText('personalizationModal.digitalAgencyOrConsultant'),
							value: DIGITAL_AGENCY_COMPANY_TYPE,
						},
						{
							label: i18n.baseText('personalizationModal.systemsIntegrator'),
							value: SYSTEMS_INTEGRATOR_COMPANY_TYPE,
						},
						{
							value: EDUCATION_TYPE,
							label: i18n.baseText('personalizationModal.education'),
						},
						{
							label: i18n.baseText('personalizationModal.other'),
							value: OTHER_COMPANY_TYPE,
						},
						{
							label: i18n.baseText('personalizationModal.imNotUsingN8nForWork'),
							value: PERSONAL_COMPANY_TYPE,
						},
					],
				},
			},
			{
				name: COMPANY_INDUSTRY_EXTENDED_KEY,
				properties: {
					type: 'multi-select',
					label: i18n.baseText('personalizationModal.whichIndustriesIsYourCompanyIn'),
					placeholder: i18n.baseText('personalizationModal.select'),
					options: [
						{
							value: FINANCE_INSURANCE_INDUSTRY,
							label: i18n.baseText('personalizationModal.financeOrInsurance'),
						},
						{
							value: GOVERNMENT_INDUSTRY,
							label: i18n.baseText('personalizationModal.government'),
						},
						{
							value: HEALTHCARE_INDUSTRY,
							label: i18n.baseText('personalizationModal.healthcare'),
						},
						{
							value: IT_INDUSTRY,
							label: i18n.baseText('personalizationModal.it'),
						},
						{
							value: LEGAL_INDUSTRY,
							label: i18n.baseText('personalizationModal.legal'),
						},
						{
							value: MSP_INDUSTRY,
							label: i18n.baseText('personalizationModal.managedServiceProvider'),
						},
						{
							value: MARKETING_INDUSTRY,
							label: i18n.baseText('personalizationModal.marketing'),
						},
						{
							value: MEDIA_INDUSTRY,
							label: i18n.baseText('personalizationModal.media'),
						},
						{
							value: MANUFACTURING_INDUSTRY,
							label: i18n.baseText('personalizationModal.manufacturing'),
						},
						{
							value: PHYSICAL_RETAIL_OR_SERVICES,
							label: i18n.baseText('personalizationModal.physicalRetailOrServices'),
						},
						{
							value: REAL_ESTATE_OR_CONSTRUCTION,
							label: i18n.baseText('personalizationModal.realEstateOrConstruction'),
						},
						{
							value: SECURITY_INDUSTRY,
							label: i18n.baseText('personalizationModal.security'),
						},
						{
							value: TELECOMS_INDUSTRY,
							label: i18n.baseText('personalizationModal.telecoms'),
						},
						{
							value: OTHER_INDUSTRY_OPTION,
							label: i18n.baseText('personalizationModal.otherPleaseSpecify'),
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
					placeholder: i18n.baseText('personalizationModal.specifyYourCompanysIndustry'),
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
					label: i18n.baseText('personalizationModal.whichRoleBestDescribesYou'),
					placeholder: i18n.baseText('personalizationModal.select'),
					options: [
						{
							value: ROLE_BUSINESS_OWNER,
							label: i18n.baseText('personalizationModal.businessOwner'),
						},
						{
							value: ROLE_CUSTOMER_SUPPORT,
							label: i18n.baseText('personalizationModal.customerSupport'),
						},
						{
							value: ROLE_DATA_SCIENCE,
							label: i18n.baseText('personalizationModal.dataScience'),
						},
						{
							value: ROLE_DEVOPS,
							label: i18n.baseText('personalizationModal.devops'),
						},
						{
							value: ROLE_IT,
							label: i18n.baseText('personalizationModal.it'),
						},
						{
							value: ROLE_ENGINEERING,
							label: i18n.baseText('personalizationModal.engineering'),
						},
						{
							value: ROLE_SALES_AND_MARKETING,
							label: i18n.baseText('personalizationModal.salesAndMarketing'),
						},
						{
							value: ROLE_SECURITY,
							label: i18n.baseText('personalizationModal.security'),
						},
						{
							value: ROLE_OTHER,
							label: i18n.baseText('personalizationModal.otherPleaseSpecify'),
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
					placeholder: i18n.baseText('personalizationModal.specifyYourRole'),
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
					label: i18n.baseText('personalizationModal.whatAreYouLookingToAutomate'),
					placeholder: i18n.baseText('personalizationModal.select'),
					options: [
						{
							value: DEVOPS_AUTOMATION_CI_CD_GOAL,
							label: i18n.baseText('personalizationModal.cicd'),
						},
						{
							value: DEVOPS_AUTOMATION_CLOUD_INFRASTRUCTURE_ORCHESTRATION_GOAL,
							label: i18n.baseText('personalizationModal.cloudInfrastructureOrchestration'),
						},
						{
							value: DEVOPS_AUTOMATION_DATA_SYNCING_GOAL,
							label: i18n.baseText('personalizationModal.dataSynching'),
						},
						{
							value: DEVOPS_INCIDENT_RESPONSE_GOAL,
							label: i18n.baseText('personalizationModal.incidentResponse'),
						},
						{
							value: DEVOPS_MONITORING_AND_ALERTING_GOAL,
							label: i18n.baseText('personalizationModal.monitoringAndAlerting'),
						},
						{
							value: DEVOPS_REPORTING_GOAL,
							label: i18n.baseText('personalizationModal.reporting'),
						},
						{
							value: DEVOPS_TICKETING_SYSTEMS_INTEGRATIONS_GOAL,
							label: i18n.baseText('personalizationModal.ticketingSystemsIntegrations'),
						},
						{
							value: OTHER_AUTOMATION_GOAL,
							label: i18n.baseText('personalizationModal.other'),
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
					placeholder: i18n.baseText('personalizationModal.specifyYourAutomationGoal'),
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
					label: i18n.baseText('personalizationModal.specifySalesMarketingGoal'),
					placeholder: i18n.baseText('personalizationModal.select'),
					options: [
						{
							label: i18n.baseText('personalizationModal.leadGeneration'),
							value: MARKETING_AUTOMATION_LEAD_GENERATION_GOAL,
						},
						{
							label: i18n.baseText('personalizationModal.customerCommunication'),
							value: MARKETING_AUTOMATION_CUSTOMER_COMMUNICATION,
						},
						{
							label: i18n.baseText('personalizationModal.customerActions'),
							value: MARKETING_AUTOMATION_ACTIONS,
						},
						{
							label: i18n.baseText('personalizationModal.adCampaign'),
							value: MARKETING_AUTOMATION_AD_CAMPAIGN,
						},
						{
							label: i18n.baseText('personalizationModal.reporting'),
							value: MARKETING_AUTOMATION_REPORTING,
						},
						{
							label: i18n.baseText('personalizationModal.dataSynching'),
							value: MARKETING_AUTOMATION_DATA_SYNCHING,
						},
						{
							label: i18n.baseText('personalizationModal.other'),
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
					placeholder: i18n.baseText('personalizationModal.specifyOtherSalesAndMarketingGoal'),
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
					label: i18n.baseText('personalizationModal.specifyAutomationBeneficiary'),
					placeholder: i18n.baseText('personalizationModal.select'),
					options: [
						{
							label: i18n.baseText('personalizationModal.myself'),
							value: AUTOMATION_BENEFICIARY_SELF,
						},
						{
							label: i18n.baseText('personalizationModal.myTeam'),
							value: AUTOMATION_BENEFICIARY_MY_TEAM,
						},
						{
							label: i18n.baseText('personalizationModal.otherTeams'),
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
					label: i18n.baseText('personalizationModal.howBigIsYourCompany'),
					placeholder: i18n.baseText('personalizationModal.select'),
					options: [
						{
							label: i18n.baseText('personalizationModal.lessThan20People'),
							value: COMPANY_SIZE_20_OR_LESS,
						},
						{
							label: `20-99 ${i18n.baseText('personalizationModal.people')}`,
							value: COMPANY_SIZE_20_99,
						},
						{
							label: `100-499 ${i18n.baseText('personalizationModal.people')}`,
							value: COMPANY_SIZE_100_499,
						},
						{
							label: `500-999 ${i18n.baseText('personalizationModal.people')}`,
							value: COMPANY_SIZE_500_999,
						},
						{
							label: `1000+ ${i18n.baseText('personalizationModal.people')}`,
							value: COMPANY_SIZE_1000_OR_MORE,
						},
						{
							label: i18n.baseText('personalizationModal.imNotUsingN8nForWork'),
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
					label: i18n.baseText('personalizationModal.howDidYouHearAboutN8n'),
					placeholder: i18n.baseText('personalizationModal.select'),
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
							label: i18n.baseText('personalizationModal.friendWordOfMouth'),
							value: REPORTED_SOURCE_FRIEND,
						},
						{
							label: i18n.baseText('personalizationModal.podcast'),
							value: REPORTED_SOURCE_PODCAST,
						},
						{
							label: i18n.baseText('personalizationModal.event'),
							value: REPORTED_SOURCE_EVENT,
						},
						{
							label: i18n.baseText('personalizationModal.otherPleaseSpecify'),
							value: REPORTED_SOURCE_OTHER,
						},
					],
				},
			},
			{
				name: REPORTED_SOURCE_OTHER_KEY,
				properties: {
					placeholder: i18n.baseText('personalizationModal.specifyReportedSource'),
				},
				shouldDisplay(values): boolean {
					const reportedSource = (values as IPersonalizationLatestVersion)[REPORTED_SOURCE_KEY];
					return reportedSource === REPORTED_SOURCE_OTHER;
				},
			},
		] as const,
);

const onSave = () => {
	formBus.emit('submit');
};

const closeCallback = () => {
	// In case the redirect to homepage for new users didn't happen
	// we try again after closing the modal
	if (route.name !== VIEWS.HOMEPAGE) {
		void router.replace({ name: VIEWS.HOMEPAGE });
	}
};

const closeDialog = () => {
	modalBus.emit('close');

	if (userPermissions.value.community.register) {
		uiStore.openModalWithData({
			name: COMMUNITY_PLUS_ENROLLMENT_MODAL,
			data: {
				closeCallback,
				customHeading: undefined,
			},
		});
	} else {
		closeCallback();
	}
};

const onSubmit = async (values: object) => {
	isSaving.value = true;

	try {
		const completedSurvey: IPersonalizationLatestVersion = {
			...values,
			version: SURVEY_VERSION,
			personalization_survey_submitted_at: new Date().toISOString(),
			personalization_survey_n8n_version: rootStore.versionCli,
		};

		await externalHooks.run('personalizationModal.onSubmit', completedSurvey);

		await usersStore.submitPersonalizationSurvey(completedSurvey);

		posthogStore.setMetadata(completedSurvey, 'user');
	} catch (e) {
		showError(e, 'Error while submitting results');
	} finally {
		isSaving.value = false;
		closeDialog();
	}
};
</script>

<template>
	<Modal
		:name="PERSONALIZATION_MODAL_KEY"
		:title="i18n.baseText('personalizationModal.customizeN8n')"
		:subtitle="i18n.baseText('personalizationModal.theseQuestionsHelpUs')"
		:center-title="true"
		:show-close="false"
		:event-bus="modalBus"
		:close-on-click-modal="false"
		:close-on-press-escape="false"
		width="460px"
		data-test-id="personalization-form"
		@enter="onSave"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-form-inputs
					v-model="formValues"
					:inputs="survey"
					:column-view="true"
					:event-bus="formBus"
					:teleported="true"
					tag-size="small"
					@submit="onSubmit"
				/>
			</div>
		</template>
		<template #footer>
			<div>
				<n8n-button
					:loading="isSaving"
					:label="i18n.baseText('personalizationModal.getStarted')"
					float="right"
					@click="onSave"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.container {
	> div,
	section > div:not(:last-child) {
		margin-bottom: var(--spacing-m);
	}
}
</style>
