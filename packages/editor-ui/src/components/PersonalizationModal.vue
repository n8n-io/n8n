<template>
	<Modal
		:name="PERSONALIZATION_MODAL_KEY"
		:title="!submitted? $i.baseText('personalizationModal.getStarted') : $i.baseText('personalizationModal.thanks')"
		:subtitle="!submitted? $i.baseText('personalizationModal.theseQuestionsHelpUs') : ''"
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
				<n8n-text>{{ $i.baseText('personalizationModal.lookOutForThingsMarked') }}</n8n-text>
			</div>
			<div :class="$style.container" v-else>
				<n8n-input-label :label="$i.baseText('personalizationModal.howAreYourCodingSkills')">
					<n8n-select :value="values[CODING_SKILL_KEY]" :placeholder="$i.baseText('personalizationModal.select')" @change="(value) => values[CODING_SKILL_KEY] = value">
						<n8n-option
							:label="baseText('personalizationModal.neverCoded')"
							value="0"
						/>
						<n8n-option
							:label="baseText('personalizationModal.iGetStuckTooQuicklyToAchieveMuch')"
							value="1"
						/>
						<n8n-option
							:label="baseText('personalizationModal.iCanCodeSomeUsefulThingsBut')"
							value="2"
						/>
						<n8n-option
							:label="baseText('personalizationModal.iKnowEnoughToBeDangerousBut')"
							value="3"
						/>
						<n8n-option
							:label="baseText('personalizationModal.iCanFigureMostThingsOut')"
							value="4"
						/>
						<n8n-option
							:label="baseText('personalizationModal.iCanDoAlmostAnythingIWant')"
							value="5"
						/>
					</n8n-select>
				</n8n-input-label>

				<n8n-input-label :label="$i.baseText('personalizationModal.whichOfTheseAreasDoYouMainlyWorkIn')">
					<n8n-select :value="values[WORK_AREA_KEY]" multiple :placeholder="$i.baseText('personalizationModal.select')" @change="(value) => onMultiInput(WORK_AREA_KEY, value)">
						<n8n-option :value="FINANCE_WORK_AREA" :label="$i.baseText('personalizationModal.finance')" />
						<n8n-option :value="HR_WORK_AREA" :label="$i.baseText('personalizationModal.hr')" />
						<n8n-option :value="IT_ENGINEERING_WORK_AREA" :label="$i.baseText('personalizationModal.itEngineering')" />
						<n8n-option :value="LEGAL_WORK_AREA" :label="$i.baseText('personalizationModal.legal')" />
						<n8n-option :value="MARKETING_WORK_AREA" :label="$i.baseText('personalizationModal.marketing')" />
						<n8n-option :value="OPS_WORK_AREA" :label="$i.baseText('personalizationModal.operations')" />
						<n8n-option :value="PRODUCT_WORK_AREA" :label="$i.baseText('personalizationModal.product')" />
						<n8n-option :value="SALES_BUSINESSDEV_WORK_AREA" :label="$i.baseText('personalizationModal.salesBizDev')" />
						<n8n-option :value="SECURITY_WORK_AREA" :label="$i.baseText('personalizationModal.security')" />
						<n8n-option :value="SUPPORT_WORK_AREA" :label="$i.baseText('personalizationModal.support')" />
						<n8n-option :value="EXECUTIVE_WORK_AREA" :label="$i.baseText('personalizationModal.executiveTeam')" />
						<n8n-option :value="OTHER_WORK_AREA_OPTION" :label="$i.baseText('personalizationModal.otherPleaseSpecify')" />
						<n8n-option :value="NOT_APPLICABLE_WORK_AREA" :label="$i.baseText('personalizationModal.imNotUsingN8nForWork')" />
					</n8n-select>
				</n8n-input-label>
				<n8n-input
					v-if="otherWorkAreaFieldVisible"
					:value="values[OTHER_WORK_AREA_KEY]"
					:placeholder="$i.baseText('personalizationModal.specifyYourWorkArea')"
					@input="(value) => values[OTHER_WORK_AREA_KEY] = value"
				/>

				<section v-if="showAllIndustryQuestions">
					<n8n-input-label :label="$i.baseText('personalizationModal.whichIndustriesIsYourCompanyIn')">
					<n8n-select :value="values[COMPANY_INDUSTRY_KEY]" multiple :placeholder="$i.baseText('personalizationModal.select')" @change="(value) => onMultiInput(COMPANY_INDUSTRY_KEY, value)">
						<n8n-option :value="E_COMMERCE_INDUSTRY" :label="$i.baseText('personalizationModal.eCommerce')" />
						<n8n-option :value="AUTOMATION_CONSULTING_INDUSTRY" :label="$i.baseText('personalizationModal.automationConsulting')" />
						<n8n-option :value="SYSTEM_INTEGRATION_INDUSTRY" :label="$i.baseText('personalizationModal.systemsIntegration')" />
						<n8n-option :value="GOVERNMENT_INDUSTRY" :label="$i.baseText('personalizationModal.government')" />
						<n8n-option :value="LEGAL_INDUSTRY" :label="$i.baseText('personalizationModal.legal')" />
						<n8n-option :value="HEALTHCARE_INDUSTRY" :label="$i.baseText('personalizationModal.healthcare')" />
						<n8n-option :value="FINANCE_INDUSTRY" :label="$i.baseText('personalizationModal.finance')" />
						<n8n-option :value="SECURITY_INDUSTRY" :label="$i.baseText('personalizationModal.security')" />
						<n8n-option :value="SAAS_INDUSTRY" :label="$i.baseText('personalizationModal.saas')" />
						<n8n-option :value="OTHER_INDUSTRY_OPTION" :label="$i.baseText('personalizationModal.otherPleaseSpecify')" />
					</n8n-select>
				</n8n-input-label>
				<n8n-input
					v-if="otherCompanyIndustryFieldVisible"
					:value="values[OTHER_COMPANY_INDUSTRY_KEY]"
					:placeholder="$i.baseText('personalizationModal.specifyYourCompanysIndustry')"
					@input="(value) => values[OTHER_COMPANY_INDUSTRY_KEY] = value"
				/>

				<n8n-input-label :label="$i.baseText('personalizationModal.howBigIsYourCompany')">
					<n8n-select :value="values[COMPANY_SIZE_KEY]" placeholder="Select..." @change="(value) => values[COMPANY_SIZE_KEY] = value">
						<n8n-option
							:label="$i.baseText('personalizationModal.lessThan20People')"
							:value="COMPANY_SIZE_20_OR_LESS"
						/>
						<n8n-option
							:label="`20-99 ${$i.baseText('personalizationModal.people')}`"
							:value="COMPANY_SIZE_20_99"
						/>
						<n8n-option
							:label="`100-499 ${$i.baseText('personalizationModal.people')}`"
							:value="COMPANY_SIZE_100_499"
						/>
						<n8n-option
							:label="`500-999 ${$i.baseText('personalizationModal.people')}`"
							:value="COMPANY_SIZE_500_999"
						/>
						<n8n-option
							:label="`1000+ ${$i.baseText('personalizationModal.people')}`"
							:value="COMPANY_SIZE_1000_OR_MORE"
						/>
						<n8n-option
							:label="$i.baseText('personalizationModal.imNotUsingN8nForWork')"
							:value="COMPANY_SIZE_PERSONAL_USE"
						/>
					</n8n-select>
				</n8n-input-label>

				</section>
			</div>
		</template>
		<template v-slot:footer>
			<div>
				<n8n-button v-if="submitted" @click="closeDialog" :label="$i.baseText('personalizationModal.getStarted')" float="right" />
				<n8n-button v-else @click="save" :loading="isSaving" :label="$i.baseText('personalizationModal.continue')" float="right" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";

import {
	AUTOMATION_CONSULTING_INDUSTRY,
	CODING_SKILL_KEY,
	COMPANY_INDUSTRY_KEY,
	COMPANY_SIZE_100_499,
	COMPANY_SIZE_1000_OR_MORE,
	COMPANY_SIZE_20_OR_LESS,
	COMPANY_SIZE_20_99,
	COMPANY_SIZE_500_999,
	COMPANY_SIZE_KEY,
	COMPANY_SIZE_PERSONAL_USE,
	E_COMMERCE_INDUSTRY,
	EXECUTIVE_WORK_AREA,
	FINANCE_INDUSTRY,
	FINANCE_WORK_AREA,
	GOVERNMENT_INDUSTRY,
	HEALTHCARE_INDUSTRY,
	HR_WORK_AREA,
	IT_ENGINEERING_WORK_AREA,
	LEGAL_INDUSTRY,
	LEGAL_WORK_AREA,
	MARKETING_WORK_AREA,
	NOT_APPLICABLE_WORK_AREA,
	OPS_WORK_AREA,
	OTHER_COMPANY_INDUSTRY_KEY,
	OTHER_INDUSTRY_OPTION,
	OTHER_WORK_AREA_KEY,
	OTHER_WORK_AREA_OPTION,
	PERSONALIZATION_MODAL_KEY,
	PRODUCT_WORK_AREA,
	SAAS_INDUSTRY,
	SALES_BUSINESSDEV_WORK_AREA,
	SECURITY_INDUSTRY,
	SECURITY_WORK_AREA,
	SUPPORT_WORK_AREA,
	SYSTEM_INTEGRATION_INDUSTRY,
	WORK_AREA_KEY,
} from "../constants";
import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import { showMessage } from "@/components/mixins/showMessage";
import Modal from "./Modal.vue";
import { IPersonalizationSurveyAnswers, IPersonalizationSurveyKeys } from "@/Interface";
import Vue from "vue";
import { mapGetters } from "vuex";

export default mixins(showMessage, workflowHelpers).extend({
	components: { Modal },
	name: "PersonalizationModal",
	data() {
		return {
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
			FINANCE_WORK_AREA,
			HR_WORK_AREA,
			IT_ENGINEERING_WORK_AREA,
			LEGAL_WORK_AREA,
			MARKETING_WORK_AREA,
			PRODUCT_WORK_AREA,
			SALES_BUSINESSDEV_WORK_AREA,
			SECURITY_WORK_AREA,
			EXECUTIVE_WORK_AREA,
			SUPPORT_WORK_AREA,
			OPS_WORK_AREA,
			OTHER_WORK_AREA_OPTION,
			NOT_APPLICABLE_WORK_AREA,
			COMPANY_SIZE_20_OR_LESS,
			COMPANY_SIZE_20_99,
			COMPANY_SIZE_100_499,
			COMPANY_SIZE_500_999,
			COMPANY_SIZE_1000_OR_MORE,
			COMPANY_SIZE_PERSONAL_USE,
			E_COMMERCE_INDUSTRY,
			AUTOMATION_CONSULTING_INDUSTRY,
			SYSTEM_INTEGRATION_INDUSTRY,
			GOVERNMENT_INDUSTRY,
			LEGAL_INDUSTRY,
			HEALTHCARE_INDUSTRY,
			FINANCE_INDUSTRY,
			SECURITY_INDUSTRY,
			SAAS_INDUSTRY,
			OTHER_INDUSTRY_OPTION,
			WORK_AREA_KEY,
			COMPANY_SIZE_KEY,
			CODING_SKILL_KEY,
			COMPANY_INDUSTRY_KEY,
			OTHER_WORK_AREA_KEY,
			OTHER_COMPANY_INDUSTRY_KEY,
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
			if (name === WORK_AREA_KEY) {
				this.otherWorkAreaFieldVisible = value.includes(OTHER_WORK_AREA_OPTION);
				this.showAllIndustryQuestions = !value.includes(NOT_APPLICABLE_WORK_AREA);
				this.values[OTHER_WORK_AREA_KEY] = value.includes(OTHER_WORK_AREA_OPTION) ? this.values[OTHER_WORK_AREA_KEY] : null;
				this.values[WORK_AREA_KEY] = value;
			}
			if (name === COMPANY_INDUSTRY_KEY) {
				this.otherCompanyIndustryFieldVisible = value.includes(OTHER_INDUSTRY_OPTION);
				this.values[OTHER_COMPANY_INDUSTRY_KEY] = value.includes(OTHER_INDUSTRY_OPTION) ? this.values[OTHER_COMPANY_INDUSTRY_KEY] : null;
				this.values[COMPANY_INDUSTRY_KEY] = value;
			}

		},
		async save(): Promise<void> {
			this.$data.isSaving = true;

			try {
				await this.$store.dispatch('settings/submitPersonalizationSurvey', this.values);

				if (this.values[WORK_AREA_KEY] === null && this.values[COMPANY_SIZE_KEY] === null && this.values[CODING_SKILL_KEY] === null) {
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
	> div, section > div:not(:last-child) {
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
