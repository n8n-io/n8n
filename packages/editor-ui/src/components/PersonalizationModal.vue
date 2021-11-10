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
							label="1"
							value="1"
						/>
						<n8n-option
							label="2"
							value="2"
						/>
						<n8n-option
							label="3"
							value="3"
						/>
						<n8n-option
							label="4"
							value="4"
						/>
						<n8n-option
							:label="`5 (${$baseText('personalizationModal.proCoder')})`"
							value="5"
						/>
					</n8n-select>
				</n8n-input-label>

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
	PERSONALIZATION_MODAL_KEY,
	AUTOMATION_CONSULTING_WORK_AREA,
	FINANCE_WORK_AREA,
	HR_WORK_AREA,
	IT_ENGINEERING_WORK_AREA,
	LEGAL_WORK_AREA,
	MARKETING_WORK_AREA,
	PRODUCT_WORK_AREA,
	SALES_BUSINESSDEV_WORK_AREA,
	SECURITY_WORK_AREA,
	SUPPORT_WORK_AREA,
	OPS_WORK_AREA,
	OTHER_WORK_AREA_OPTION,
	COMPANY_SIZE_20_OR_LESS,
	COMPANY_SIZE_20_99,
	COMPANY_SIZE_100_499,
	COMPANY_SIZE_500_999,
	COMPANY_SIZE_1000_OR_MORE,
	COMPANY_SIZE_PERSONAL_USE,
	WORK_AREA_KEY,
	COMPANY_SIZE_KEY,
	CODING_SKILL_KEY,
	OTHER_WORK_AREA_KEY,
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
			modalBus: new Vue(),
			values: {
				[WORK_AREA_KEY]: null,
				[COMPANY_SIZE_KEY]: null,
				[CODING_SKILL_KEY]: null,
				[OTHER_WORK_AREA_KEY]: null,
			} as IPersonalizationSurveyAnswers,
			AUTOMATION_CONSULTING_WORK_AREA,
			FINANCE_WORK_AREA,
			HR_WORK_AREA,
			IT_ENGINEERING_WORK_AREA,
			LEGAL_WORK_AREA,
			MARKETING_WORK_AREA,
			PRODUCT_WORK_AREA,
			SALES_BUSINESSDEV_WORK_AREA,
			SECURITY_WORK_AREA,
			SUPPORT_WORK_AREA,
			OPS_WORK_AREA,
			OTHER_WORK_AREA_OPTION,
			COMPANY_SIZE_20_OR_LESS,
			COMPANY_SIZE_20_99,
			COMPANY_SIZE_100_499,
			COMPANY_SIZE_500_999,
			COMPANY_SIZE_1000_OR_MORE,
			COMPANY_SIZE_PERSONAL_USE,
			WORK_AREA_KEY,
			COMPANY_SIZE_KEY,
			CODING_SKILL_KEY,
			OTHER_WORK_AREA_KEY,
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
			if (name === WORK_AREA_KEY && value === OTHER_WORK_AREA_OPTION) {
				this.otherWorkAreaFieldVisible = true;
			}
			else if (name === WORK_AREA_KEY) {
				this.otherWorkAreaFieldVisible = false;
				this.values[OTHER_WORK_AREA_KEY] = null;
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
	> div:not(:last-child) {
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
