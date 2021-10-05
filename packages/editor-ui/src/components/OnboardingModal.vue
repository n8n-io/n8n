<template>
	<Modal
		:name="ONBOARDING_MODAL_KEY"
		title="Get started"
		subtitle="These questions help us tailor n8n to you"
		:centerTitle="true"
		:showClose="false"
		:eventBus="modalBus"
		width="460px"
		@enter="save"
		@input="onInput"
	>
		<template v-slot:content>
			<div :class="$style.container">
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
							value="500"
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
				<n8n-button @click="save" :loading="isSaving" label="Continue" float="right" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";

import { ONBOARDING_MODAL_KEY } from "../constants";
import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import { showMessage } from "@/components/mixins/showMessage";
import Modal from "./Modal.vue";
import { ISurvey } from "@/Interface";
import Vue from "vue";

type SurveyKey = "workArea" | "otherWorkArea" | "companySize" | "codingSkill";

export default mixins(showMessage, workflowHelpers).extend({
	components: { Modal },
	name: "OnboardingModal",
	data() {
		return {
			isSaving: false,
			ONBOARDING_MODAL_KEY,
			otherWorkAreaFieldVisible: false,
			modalBus: new Vue(),
			values: {
				workArea: null,
				otherWorkArea: null,
				companySize: null,
				codingSkill: null,
			} as ISurvey,
		};
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
				await this.$store.dispatch('settings/submitOnboardingSurvey', this.values);

				this.closeDialog();
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
	> div {
		margin-bottom: var(--spacing-m);
	}
}
</style>
