<template>
	<Modal
		:name="ONBOARDING_MODAL_KEY"
		title="Get started"
		subtitle="These questions help us tailor n8n to you"
		:center="true"
		:centerTitle="true"
		:showClose="false"
		width="460px"
		@enter="save"
		@input="onInput"
	>
		<template v-slot:content>
			<div :class="$style.container">
				<n8n-form-inputs :inputs="inputs" :columnView="true" />
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
import { IFormInputs } from "@/Interface";
import { N8nFormInputs } from "n8n-design-system";
import Vue from "vue";

const SURVEY_QUESTIONS = [
	{
		name: 'workArea',
		properties: {
			type: 'select',
			label: 'Which of these areas do you mainly work in?',
			placeholder: 'Select...',
			options: [
				{
					label: 'Automation consulting',
					value: 'automationConsulting',
				},
				{
					label: 'Finance / Procurement / HR',
					value: 'finance-procurment-HR',
				},
				{
					label: 'IT / Engineering',
					value: 'IT-Engineering',
				},
				{
					label: 'Legal',
					value: 'legal',
				},
				{
					label: 'Marketing / Growth',
					value: 'marketing-growth',
				},
				{
					label: 'Product',
					value: 'product',
				},
				{
					label: 'Sales / Business Development',
					value: 'sales-businessDevelopment',
				},
				{
					label: 'Security',
					value: 'security',
				},
				{
					label: 'Support / Operations',
					value: 'support-operations',
				},
				{
					label: 'Other (please specify)',
					value: 'other',
				},
			],
		},
	},
	{
		name: 'otherWorkArea',
		properties: {
			type: 'text',
			placeholder: 'Specify your work area',
		},
		visible(values: {workArea: string}) {
			return values.workArea === 'other';
		},
	},
	{
		name: 'codingSkill',
		properties: {
			type: 'select',
			label: 'How are your coding skills?',
			placeholder: 'Select...',
			options: [
				{
					label: '0 (Never coded)',
					value: '0',
				},
				{
					label: '1',
					value: '1',
				},
				{
					label: '2',
					value: '2',
				},
				{
					label: '3',
					value: '3',
				},
				{
					label: '4',
					value: '4',
				},
				{
					label: '5 (Pro coder)',
					value: '5',
				},
			],
		},
	},
	{
		name: 'companySize',
		properties: {
			type: 'select',
			label: 'How big is your company?',
			placeholder: 'Select...',
			options: [
				{
					label: 'Less than 20 people',
					value: '<20',
				},
				{
					label: '20-99 people',
					value: '20-99',
				},
				{
					label: '100-499 people',
					value: '100-499',
				},
				{
					label: '500-999 people',
					value: '500',
				},
				{
					label: '1000+ people',
					value: '1000+',
				},
				{
					label: `I'm not using n8n for work`,
					value: 'personalUse',
				},
			],
		},
	},
];

export default mixins(showMessage, workflowHelpers).extend({
	components: { Modal, N8nFormInputs },
	name: "OnboardingModal",
	data() {
		return {
			isSaving: false,
			ONBOARDING_MODAL_KEY,
			inputs: [SURVEY_QUESTIONS] as IFormInputs | null,
			otherWorkAreaFieldVisible: false,
			modalBus: new Vue(),
		};
	},
	methods: {
		closeDialog() {
			this.modalBus.$emit('close');
		},
		onInput(e: {name: string, value: string}) {
			if (e.name === 'workArea' && e.value === 'other') {
				this.otherWorkAreaFieldVisible = true;
			}
			else {
				this.otherWorkAreaFieldVisible = false;
			}
		},
		async save(values: {[key: string]: string}): Promise<void> {
			this.$data.isSaving = true;

			try {
				await this.$store.dispatch('settings/setSurveyResults', values);

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
