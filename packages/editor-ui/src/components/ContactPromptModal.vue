<template>
	<Modal
		:name="modalName"
		:eventBus="modalBus"
		:center="true"
		:closeOnPressEscape="false"
		:customClass="'contact-prompt-modal'"
		:beforeClose="closeDialog"
		title="You're a power user"
		minWidth="460px"
		maxWidth="460px"
	>
		<template slot="header">
			<h2 :class="$style.title" v-text="title" />
		</template>
		<template v-slot:content>
			<div :class="$style.description" v-text="description" />
			<n8n-input
				v-model="email"
				@input="onInputChange"
				placeholder="Your email address"
			/>
			<div :class="$style.disclaimer">David from our product team will reach out personally.</div>
		</template>
		<template v-slot:footer>
			<div :class="$style.footer">
				<n8n-button label="Send" float="right" @click="send" :disabled="!isEmailValid" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from "vue";
import mixins from "vue-typed-mixins";
import { mapGetters } from 'vuex';

import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import Modal from "./Modal.vue";

export default mixins(workflowHelpers).extend({
	components: { Modal },
	name: "ContactPromptModal",
	props: ["modalName"],
	data() {
		return {
			email: '',
			isEmailValid: false,
			modalBus: new Vue(),
		};
	},
	computed: {
		...mapGetters({
			promptData: 'settings/getPromptsData',
		}),
		title() : string {
			if (this.promptData.title) {
				return this.promptData.title;
			} else {
				return 'You’re a power user 💪';
			}
		},
		description() : string {
			if (this.promptData.message) {
				return this.promptData.message;
			} else {
				return 'Your experience with n8n can help us improve - for you and our entire community.';
			}
		},
	},
	methods: {
		closeDialog(): void {
			if (!this.isEmailValid) {
				this.$telemetry.track('User closed email modal', { instance_id: this.$store.getters.instanceId, email: null });
			}
			this.$store.commit('ui/closeTopModal');
		},
		onInputChange(value: string): void {
			this.isEmailValid = this.validateEmail(value);
		},
		send(): void {
			if (this.isEmailValid) {
				this.$store.dispatch('settings/updateContactPrompt', this.email);
				this.$telemetry.track('User closed email modal', { instance_id: this.$store.getters.instanceId, email: this.email });
				this.$showMessage({
					title: 'Thanks!',
					message: "It's people like you that help make n8n better",
					type: 'success',
				});
			}
			this.closeDialog();
		},
		validateEmail(email: string) {
			const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			return re.test(String(email).toLowerCase());
		},
	},
});
</script>

<style lang="scss" module>
.title {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-regular);
}
.description {
	margin-bottom: var(--spacing-s);
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-xloose);
}
.disclaimer {
	margin-top: var(--spacing-4xs);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-xloose);
}
</style>

<style lang="scss">
.dialog-wrapper {
	.contact-prompt-modal {
		.el-dialog__body {
			padding: 16px 24px 24px;
		}
	}
}
</style>
