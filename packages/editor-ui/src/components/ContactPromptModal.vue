<template>
	<Modal
		:name="modalName"
		:eventBus="modalBus"
		title="You're a power user"
		:center="true"
		minWidth="460px"
		maxWidth="460px"
	>
		<template slot="header">
			<h2 :class="$style.title">You’re a power user 💪</h2>
		</template>
		<template v-slot:content>
			<div :class="$style.description">Your experience with n8n can help us improve - for you and our entire community.</div>
			<div :class="$style.subtitle">Can our Product team reach out?</div>
			<div :class="$style.content">
				<n8n-input
					v-model="email"
					@input="onInputChange"
					placeholder="Your emaill address"
				/>
			</div>
			<div :class="$style.disclaimer">Our contact team will contact you personally. No spam, promise!</div>
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
	methods: {
		closeDialog(): void {
			if (!this.isEmailValid) {
				this.$telemetry.track('User closed email modal', { instance_id: this.$store.getters.instanceId, email: null });
			}
			this.modalBus.$emit("close");
		},
		onInputChange(value: string): void {
			this.isEmailValid = this.validateEmail(value);
		},
		send(): void {
			if (this.isEmailValid) {
				this.$telemetry.track('User closed email modal', { instance_id: this.$store.getters.instanceId, email: this.email });
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
	margin-bottom: var(--spacing-xs);
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-xloose);
}

.subtitle {
	margin-bottom: var(--spacing-2xs);
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	line-height: var(--font-line-height-xloose);
}

.disclaimer {
	margin-top: var(--spacing-3xs);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-xloose);
}
</style>
