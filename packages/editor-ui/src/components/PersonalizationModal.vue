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
		@enter="save"
	>
		<template v-slot:content>
			<div v-if="submitted" :class="$style.submittedContainer">
				<img :class="$style.demoImage" :src="baseUrl + 'suggestednodes.png'" />
				<n8n-text>{{ $locale.baseText('personalizationModal.lookOutForThingsMarked') }}</n8n-text>
			</div>
			<div :class="$style.container" v-else>
				<n8n-form-inputs :inputs="survey" :columnView="true" />
			</div>
		</template>
		<template v-slot:footer>
			<div>
				<n8n-button
					v-if="submitted"
					@click="closeDialog"
					:label="$locale.baseText('personalizationModal.getStarted')"
					float="right"
				/>
				<n8n-button
					v-else
					@click="save"
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

import {
	CODING_SKILL_KEY,
	COMPANY_INDUSTRY_KEY,
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
	OTHER_COMPANY_INDUSTRY_KEY,
	OTHER_INDUSTRY_OPTION,
	OTHER_WORK_AREA_KEY,
	PERSONALIZATION_MODAL_KEY,
	SECURITY_INDUSTRY,
	WORK_AREA_KEY,
	EDUCATION_INDUSTRY,
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
	CUSTOMER_TYPE_KEY,
	MSP_FOCUS_KEY,
	MSP_FOCUS_OTHER_KEY,
	SAAS_COMPANY_TYPE,
	ECOMMERCE_COMPANY_TYPE,
	MSP_COMPANY_TYPE,
	DIGITAL_AGENCY_COMPANY_TYPE,
	AUTOMATION_AGENCY_COMPANY_TYPE,
	SYSTEMS_INTEGRATOR_COMPANY_TYPE,
	OTHER_COMPANY_TYPE,
	PERSONAL_COMPANY_TYPE,
	INDIVIDUAL_CUSTOMER_TYPE,
	SMALL_CUSTOMER_TYPE,
	MEDIUM_CUSTOMER_TYPE,
	LARGE_CUSTOMER_TYPE,
	CLOUD_INFRA_FOCUS,
	IT_SUPPORT_FOCUS,
	NETWORKING_COMMUNICATION_FOCUS,
	SECURITY_FOCUS,
	OTHER_FOCUS,
} from '../constants';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import Modal from './Modal.vue';
import {
	IFormInputs,
	IPersonalizationSurveyAnswers,
	IPersonalizationSurveyKeys,
} from '@/Interface';
import Vue from 'vue';
import { mapGetters } from 'vuex';

export default mixins(showMessage, workflowHelpers).extend({
	components: { Modal },
	name: 'PersonalizationModal',
	data() {
		const survey: IFormInputs = [
			{
				name: CODING_SKILL_KEY,
				properties: {
					label: this.$locale.baseText('personalizationModal.howAreYourCodingSkills'),
					type: 'select',
					placeholder: this.$locale.baseText('personalizationModal.select'),
					options: [
						{
							label: this.$locale.baseText('personalizationModal.neverCoded'),
							value: '0',
						},
						{
							label: this.$locale.baseText('personalizationModal.iGetStuckTooQuicklyToAchieveMuch'),
							value: '1',
						},
						{
							label: this.$locale.baseText('personalizationModal.iCanCodeSomeUsefulThingsBut'),
							value: '2',
						},
						{
							label: this.$locale.baseText('personalizationModal.iKnowEnoughToBeDangerousBut'),
							value: '3',
						},
						{
							label: this.$locale.baseText('personalizationModal.iCanFigureMostThingsOut'),
							value: '4',
						},
						{
							label: this.$locale.baseText('personalizationModal.iCanDoAlmostAnythingIWant'),
							value: '5',
						},
					],
				},
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
							label: this.$locale.baseText('personalizationModal.managedServiceProvider'),
							value: MSP_COMPANY_TYPE,
						},
						{
							label: this.$locale.baseText('personalizationModal.digitalAgencyOrConsultant'),
							value: DIGITAL_AGENCY_COMPANY_TYPE,
						},
						{
							label: this.$locale.baseText('personalizationModal.automationAgencyOrConsultant'),
							value: AUTOMATION_AGENCY_COMPANY_TYPE,
						},
						{
							label: this.$locale.baseText('personalizationModal.systemsIntegrator'),
							value: SYSTEMS_INTEGRATOR_COMPANY_TYPE,
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
				name: CUSTOMER_TYPE_KEY,
				properties: {
					label: this.$locale.baseText('personalizationModal.whatKindOfCustomersDoYouServe'),
					type: 'select',
					placeholder: this.$locale.baseText('personalizationModal.select'),
					options: [
						{
							label: this.$locale.baseText('personalizationModal.individualConsumers'),
							value: INDIVIDUAL_CUSTOMER_TYPE,
						},
						{
							label: this.$locale.baseText('personalizationModal.smallBusinesses'),
							value: SMALL_CUSTOMER_TYPE,
						},
						{
							label: this.$locale.baseText('personalizationModal.mediumBusinesses'),
							value: MEDIUM_CUSTOMER_TYPE,
						},
						{
							label: this.$locale.baseText('personalizationModal.largeBusinesses'),
							value: LARGE_CUSTOMER_TYPE,
						},
					],
				},
			},
			{
				name: MSP_FOCUS_KEY,
				properties: {
					label: this.$locale.baseText('personalizationModal.whatDoesYourCompanyFocusOn'),
					type: 'select',
					placeholder: this.$locale.baseText('personalizationModal.select'),
					options: [
						{
							label: this.$locale.baseText('personalizationModal.cloudInfrastructure'),
							value: CLOUD_INFRA_FOCUS,
						},
						{
							label: this.$locale.baseText('personalizationModal.itSupport'),
							value: IT_SUPPORT_FOCUS,
						},
						{
							label: this.$locale.baseText('personalizationModal.networkingOrCommunication'),
							value: NETWORKING_COMMUNICATION_FOCUS,
						},
						{
							label: this.$locale.baseText('personalizationModal.security'),
							value: SECURITY_FOCUS,
						},
						{
							label: this.$locale.baseText('personalizationModal.otherPleaseSpecify'),
							value: OTHER_FOCUS,
						},
					],
				},
			},
			{
				name: MSP_FOCUS_OTHER_KEY,
				properties: {
					placeholder: this.$locale.baseText('personalizationModal.pleaseSpecifyYourCompanyFocus'),
				},
			},
			{
				name: COMPANY_INDUSTRY_KEY,
				properties: {
					type: 'multi-select',
					label: this.$locale.baseText('personalizationModal.whichIndustriesIsYourCompanyIn'),
					placeholder: this.$locale.baseText('personalizationModal.select'),
					options: [
						{
							value: EDUCATION_INDUSTRY,
							label: this.$locale.baseText('personalizationModal.education'),
						},
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
			},
			{
				name: OTHER_COMPANY_INDUSTRY_KEY,
				properties: {
					placeholder: this.$locale.baseText('personalizationModal.specifyYourCompanysIndustry'),
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
			},
			{
				name: AUTOMATION_GOAL_OTHER_KEY,
				properties: {
					placeholder: this.$locale.baseText('personalizationModal.specifyYourAutomationGoal'),
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
			},
		];

		return {
			survey,
			submitted: false,
			isSaving: false,
			PERSONALIZATION_MODAL_KEY,
			otherWorkAreaFieldVisible: false,
			otherCompanyIndustryFieldVisible: false,
			showAllIndustryQuestions: true,
			modalBus: new Vue(),
			values: {
				[WORK_AREA_KEY]: [],
				[COMPANY_SIZE_KEY]: null,
				[CODING_SKILL_KEY]: null,
				[OTHER_WORK_AREA_KEY]: null,
				[COMPANY_INDUSTRY_KEY]: [],
				[OTHER_COMPANY_INDUSTRY_KEY]: null,
			} as IPersonalizationSurveyAnswers,
		};
	},
	computed: {
		...mapGetters({
			baseUrl: 'getBaseUrl',
		}),
	},
	methods: {
		closeDialog() {
			this.modalBus.$emit('close');
		},
		onMultiInput(name: IPersonalizationSurveyKeys, value: string[]) {
			if (name === COMPANY_INDUSTRY_KEY) {
				this.otherCompanyIndustryFieldVisible = value.includes(OTHER_INDUSTRY_OPTION);
				this.values[OTHER_COMPANY_INDUSTRY_KEY] = value.includes(OTHER_INDUSTRY_OPTION)
					? this.values[OTHER_COMPANY_INDUSTRY_KEY]
					: null;
				this.values[COMPANY_INDUSTRY_KEY] = value;
			}
		},
		async save(): Promise<void> {
			this.$data.isSaving = true;

			try {
				await this.$store.dispatch('users/submitPersonalizationSurvey', this.values);

				if (
					this.values[WORK_AREA_KEY] === null &&
					this.values[COMPANY_SIZE_KEY] === null &&
					this.values[CODING_SKILL_KEY] === null
				) {
					this.closeDialog();
				}

				this.submitted = true;
			} catch (e) {
				this.$showError(e, 'Error while submitting results');
			}

			this.$data.isSaving = false;
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
