<template>
	<Modal
		:name="PERSONALIZATION_MODAL_KEY"
		:title="!submitted? $baseText('personalizationModal.getStarted') : $baseText('personalizationModal.thanks')"
		:subtitle="!submitted? $baseText('personalizationModal.theseQuestionsHelpUs') : ''"
		:centerTitle="true"
		:showClose="false"
		:eventBus="modalBus"
		:closeOnClickModal="false"
		:closeOnPressEscape="false"
		width="460px"
		@enter="save"
		@input="onInput"
	>
		<template v-slot:content>
			<div v-if="submitted" :class="$style.submittedContainer">
				<img :class="$style.demoImage" :src="baseUrl + 'suggestednodes.png'" />
				<n8n-text>{{ $baseText('personalizationModal.lookOutForThingsMarked') }}</n8n-text>
			</div>
			<div :class="$style.container" v-else>
				<n8n-input-label :label="$baseText('personalizationModal.whichOfTheseAreasDoYouMainlyWorkIn')">
					<n8n-select :value="values[WORK_AREA_KEY]" :placeholder="$baseText('personalizationModal.select')" @change="(value) => onInput(WORK_AREA_KEY, value)">
						<n8n-option :value="AUTOMATION_CONSULTING_WORK_AREA" :label="$baseText('personalizationModal.automationConsulting')" />
						<n8n-option :value="FINANCE_WORK_AREA" :label="$baseText('personalizationModal.finance')" />
						<n8n-option :value="HR_WORK_AREA" :label="$baseText('personalizationModal.hr')" />
						<n8n-option :value="IT_ENGINEERING_WORK_AREA" :label="$baseText('personalizationModal.itEngineering')" />
						<n8n-option :value="LEGAL_WORK_AREA" :label="$baseText('personalizationModal.legal')" />
						<n8n-option :value="MARKETING_WORK_AREA" :label="$baseText('personalizationModal.marketingGrowth')" />
						<n8n-option :value="OPS_WORK_AREA" :label="$baseText('personalizationModal.operations')" />
						<n8n-option :value="PRODUCT_WORK_AREA" :label="$baseText('personalizationModal.product')" />
						<n8n-option :value="SALES_BUSINESSDEV_WORK_AREA" :label="$baseText('personalizationModal.salesBusinessDevelopment')" />
						<n8n-option :value="SECURITY_WORK_AREA" :label="$baseText('personalizationModal.security')" />
						<n8n-option :value="SUPPORT_WORK_AREA" :label="$baseText('personalizationModal.support')" />
						<n8n-option :value="OTHER_WORK_AREA_OPTION" :label="$baseText('personalizationModal.otherPleaseSpecify')" />
					</n8n-select>
				</n8n-input-label>

				<n8n-input
					v-if="otherWorkAreaFieldVisible"
					:value="values[OTHER_WORK_AREA_KEY]"
					:placeholder="$baseText('personalizationModal.specifyYourWorkArea')"
					@input="(value) => onInput(OTHER_WORK_AREA_KEY, value)"
				/>

				<n8n-input-label :label="$baseText('personalizationModal.howAreYourCodingSkills')">
					<n8n-select :value="values[CODING_SKILL_KEY]" :placeholder="$baseText('personalizationModal.select')" @change="(value) => onInput(CODING_SKILL_KEY, value)">
						<n8n-option
							:label="`0 (${baseText('personalizationModal.neverCoded')})`"
							value="0"
						/>
						<n8n-option
							label="1. I get stuck too quickly to achieve much"
							value="1"
						/>
						<n8n-option
							label="2. I can code some useful things, but I spend a lot of time stuck"
							value="2"
						/>
						<n8n-option
							label="3. I know enough to be dangerous, but I'm no expert"
							value="3"
						/>
						<n8n-option
							label="4. I can figure most things out"
							value="4"
						/>
						<n8n-option
							label="5. I can do almost anything I want, easily (pro coder)"
							value="5"
						/>
					</n8n-select>
				</n8n-input-label>

				<n8n-input-label label="Which areas do you mainly work in?">
					<n8n-select :value="values[WORK_AREA_KEY]" multiple placeholder="Select..." @change="(value) => onInput(WORK_AREA_KEY, value)">
						<n8n-option :value="FINANCE_WORK_AREA" label="Finance" />
						<n8n-option :value="HR_WORK_AREA" label="HR" />
						<n8n-option :value="IT_ENGINEERING_WORK_AREA" label="IT / Engineering" />
						<n8n-option :value="LEGAL_WORK_AREA" label="Legal" />
						<n8n-option :value="MARKETING_WORK_AREA" label="Marketing" />
						<n8n-option :value="OPS_WORK_AREA" label="Operations" />
						<n8n-option :value="PRODUCT_WORK_AREA" label="Product" />
						<n8n-option :value="SALES_BUSINESSDEV_WORK_AREA" label="Sales / Bizdev" />
						<n8n-option :value="SECURITY_WORK_AREA" label="Security" />
						<n8n-option :value="SUPPORT_WORK_AREA" label="Support" />
						<n8n-option :value="EXECUTIVE_WORK_AREA" label="Executive team" />
						<n8n-option :value="OTHER_WORK_AREA_OPTION" label="Other (please specify)" />
						<n8n-option :value="NOT_APPLICABLE_WORK_AREA" label="I'm not using n8n for work" />
					</n8n-select>
				</n8n-input-label>
				<n8n-input
					v-if="otherWorkAreaFieldVisible"
					:value="values[OTHER_WORK_AREA_KEY]"
					placeholder="Specify your work area"
					@input="(value) => onInput(OTHER_WORK_AREA_KEY, value)"
				/>

				<section v-if="showAllIndustryQuestions">
					<n8n-input-label label="Which industries is your company in?">
					<n8n-select :value="values[COMPANY_INDUSTRY_KEY]" multiple placeholder="Select..." @change="(value) => onInput(COMPANY_INDUSTRY_KEY, value)">
						<n8n-option :value="E_COMMERCE_INDUSTRY" label="eCommerce" />
						<n8n-option :value="AUTOMATION_CONSULTING_INDUSTRY" label="Automation consulting" />
						<n8n-option :value="SYSTEM_INTEGRATION_INDUSTRY" label="Systems integration" />
						<n8n-option :value="GOVERNMENT_INDUSTRY" label="Government" />
						<n8n-option :value="LEGAL_INDUSTRY" label="Legal" />
						<n8n-option :value="HEALTHCARE_INDUSTRY" label="Healthcare" />
						<n8n-option :value="FINANCE_INDUSTRY" label="Finance" />
						<n8n-option :value="SECURITY_INDUSTRY" label="Security" />
						<n8n-option :value="SAAS_INDUSTRY" label="SaaS" />
						<n8n-option :value="OTHER_INDUSTRY_OPTION" label="Other (please specify)" />
					</n8n-select>
				</n8n-input-label>
				<n8n-input
					v-if="otherCompanyIndustryFieldVisible"
					:value="values[OTHER_COMPANY_INDUSTRY_KEY]"
					placeholder="Specify your company's industry"
					@input="(value) => onInput(OTHER_COMPANY_INDUSTRY_KEY, value)"
				/>

				<n8n-input-label :label="$baseText('personalizationModal.howBigIsYourCompany')">
					<n8n-select :value="values[COMPANY_SIZE_KEY]" :placeholder="$baseText('personalizationModal.select')" @change="(value) => onInput(COMPANY_SIZE_KEY, value)">
						<n8n-option
							:label="$baseText('personalizationModal.lessThan20People')"
							:value="COMPANY_SIZE_20_OR_LESS"
						/>
						<n8n-option
							:label="`20-99 ${$baseText('personalizationModal.people')}`"
							:value="COMPANY_SIZE_20_99"
						/>
						<n8n-option
							:label="`100-499 ${$baseText('personalizationModal.people')}`"
							:value="COMPANY_SIZE_100_499"
						/>
						<n8n-option
							:label="`500-999 ${$baseText('personalizationModal.people')}`"
							:value="COMPANY_SIZE_500_999"
						/>
						<n8n-option
							:label="`1000+ ${$baseText('personalizationModal.people')}`"
							:value="COMPANY_SIZE_1000_OR_MORE"
						/>
						<n8n-option
							:label="$baseText('personalizationModal.imNotUsingN8nForWork')"
							:value="COMPANY_SIZE_PERSONAL_USE"
						/>
					</n8n-select>
				</n8n-input-label>

				</section>
			</div>
		</template>
		<template v-slot:footer>
			<div>
				<n8n-button v-if="submitted" @click="closeDialog" :label="$baseText('personalizationModal.getStarted')" float="right" />
				<n8n-button v-else @click="save" :loading="isSaving" :label="$baseText('personalizationModal.continue')" float="right" />
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
import { renderText } from "@/components/mixins/renderText";
import Modal from "./Modal.vue";
import { IPersonalizationSurveyAnswers, IPersonalizationSurveyKeys } from "@/Interface";
import Vue from "vue";
import { mapGetters } from "vuex";

export default mixins(showMessage, renderText, workflowHelpers).extend({
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
				[WORK_AREA_KEY]: null,
				[COMPANY_SIZE_KEY]: null,
				[CODING_SKILL_KEY]: null,
				[OTHER_WORK_AREA_KEY]: null,
				[COMPANY_INDUSTRY_KEY]: null,
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
		onInput(name: IPersonalizationSurveyKeys, value: string) {
			if (name === WORK_AREA_KEY && value.includes(OTHER_WORK_AREA_OPTION)) {
				this.otherWorkAreaFieldVisible = true;
			}
			else if (name === WORK_AREA_KEY && value.includes(NOT_APPLICABLE_WORK_AREA)) {
				this.showAllIndustryQuestions = false;
			}
			else if (name === WORK_AREA_KEY) {
				this.otherWorkAreaFieldVisible = false;
				this.showAllIndustryQuestions = true;
				this.values[OTHER_WORK_AREA_KEY] = null;
			}

			if (name === COMPANY_INDUSTRY_KEY && value.includes(OTHER_INDUSTRY_OPTION)) {
				this.otherCompanyIndustryFieldVisible = true;
			}
			else if (name === COMPANY_INDUSTRY_KEY) {
				this.otherCompanyIndustryFieldVisible = false;
				this.values[OTHER_COMPANY_INDUSTRY_KEY] = null;
			}

			this.values[name] = value;
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
				this.$showError(e, this.$baseText('personalizationModal.errorWhileSubmittingResults'));
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
