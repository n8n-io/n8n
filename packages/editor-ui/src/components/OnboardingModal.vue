<template>
	<Modal
		:name="ONBOARDING_MODAL_KEY"
		title="Get started"
		subtitle="These questions help us tailor n8n to you"
		:center="true"
		:centerTitle="true"
		width="460px"
		@enter="save"
	>
		<template v-slot:content>
			<div :class="$style.container">
			</div>
		</template>
		<template v-slot:footer="{ close }">
			<div>
				<n8n-button @click="() => save(close)" :loading="isSaving" label="Continue" float="right" />
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

export default mixins(showMessage, workflowHelpers).extend({
	components: { Modal },
	name: "OnboardingModal",
	data() {
		return {
			isSaving: false,
			ONBOARDING_MODAL_KEY,
		};
	},
	methods: {
		async save(close: () => void): Promise<void> {
			this.$data.isSaving = true;

			try {
				await this.$store.dispatch('settings/setSurveyResults');

				close();
			} catch (e) {

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
