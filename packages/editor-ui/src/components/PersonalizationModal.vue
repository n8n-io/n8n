<template>
	<Modal
		:name="PERSONALIZATION_MODAL_KEY"
		:title="!submitted? 'Get started' : 'Thanks!'"
		:subtitle="!submitted? 'These questions help us tailor n8n to you' : ''"
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
				<n8n-text>Look out for things marked with a ✨. They are personalized to make n8n more relevant to you.</n8n-text>
			</div>
			<div :class="$style.container" v-else>
				<n8n-input-label label="Which of these areas do you mainly work in?">
					<n8n-select :value="values.workArea" placeholder="Select..." @change="(value) => onInput('workArea', value)">
						<n8n-option value="automationConsulting" label="Automation consulting" />
						<n8n-option value="finance-procurment-HR" label="Finance / Procurement / HR" />
						<n8n-option value="IT-Engineering" label="IT / Engineering" />
						<n8n-option value="legal" label="Legal" />
						<n8n-option value="marketing-growth" label="Marketing / Growth" />
						<n8n-option value="product" label="Product" />
						<n8n-option value="sales-businessDevelopment" label="Sales / Business Development" />
						<n8n-option value="security" label="Security" />
						<n8n-option value="support-operations" label="Support / Operations" />
						<n8n-option value="other" label="Other (please specify)" />
					</n8n-select>
				</n8n-input-label>

				<n8n-input
					v-if="otherWorkAreaFieldVisible"
					:value="values.otherWorkArea"
					placeholder="Specify your work area"
					@input="(value) => onInput('otherWorkArea', value)"
				/>

				<n8n-input-label label="How are your coding skills?">
					<n8n-select :value="values.codingSkill" placeholder="Select..." @change="(value) => onInput('codingSkill', value)">
						<n8n-option
							label="0 (Never coded)"
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
							label="5 (Pro coder)"
							value="5"
						/>
					</n8n-select>
				</n8n-input-label>

				<n8n-input-label label="How big is your company?">
					<n8n-select :value="values.companySize" placeholder="Select..." @change="(value) => onInput('companySize', value)">
						<n8n-option
							label="Less than 20 people"
							value="<20"
						/>
						<n8n-option
							label="20-99 people"
							value="20-99"
						/>
						<n8n-option
							label="100-499 people"
							value="100-499"
						/>
						<n8n-option
							label="500-999 people"
							value="500-999"
						/>
						<n8n-option
							label="1000+ people"
							value="1000+"
						/>
						<n8n-option
							label="I'm not using n8n for work"
							value="personalUse"
						/>
					</n8n-select>
				</n8n-input-label>
			</div>
		</template>
		<template v-slot:footer>
			<div>
				<n8n-button v-if="submitted" @click="closeDialog" label="Get started" float="right" />
				<n8n-button v-else @click="save" :loading="isSaving" label="Continue" float="right" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";

import { PERSONALIZATION_MODAL_KEY } from "../constants";
import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import { showMessage } from "@/components/mixins/showMessage";
import Modal from "./Modal.vue";
import { IPersonalizationSurveyAnswers } from "@/Interface";
import Vue from "vue";
import { mapGetters } from "vuex";

type SurveyKey = "workArea" | "otherWorkArea" | "companySize" | "codingSkill";

export default mixins(showMessage, workflowHelpers).extend({
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
				workArea: null,
				otherWorkArea: null,
				companySize: null,
				codingSkill: null,
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
		onInput(name: SurveyKey, value: string) {
			if (name === 'workArea' && value === 'other') {
				this.otherWorkAreaFieldVisible = true;
			}
			else if (name === 'workArea') {
				this.otherWorkAreaFieldVisible = false;
				this.values.otherWorkArea = null;
			}

			this.values[name] = value;
		},
		async save(): Promise<void> {
			this.$data.isSaving = true;

			try {
				await this.$store.dispatch('settings/submitPersonalizationSurvey', this.values);

				if (this.values.workArea === null && this.values.companySize === null && this.values.codingSkill === null) {
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
