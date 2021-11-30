<template>
	<ModalDrawer
		:name="VALUE_SURVEY_MODAL_KEY"
		:beforeClose="closeDialog"
		direction="btt"
		width="120px"
		class="value-survey"
	>
		<template slot="header">
			<span :class="$style.title" v-text="getTitle" />
		</template>
		<template slot="content">
			<section :class="$style.content">
				<div v-if="showButtons" :class="$style.buttons">
					<n8n-button @click="selectSurveyValue('very')" label="Very disappointed" />
					<n8n-button @click="selectSurveyValue('somewhat')" label="Somewhat disappointed" />
					<n8n-button @click="selectSurveyValue('not')" label="Not disappointed (it isn’t really that useful)" />
				</div>
				<div v-else :class="$style.email">
					<div :class="$style.input">
						<n8n-input
							v-model="form.email"
							@input="onInputChange"
							placeholder="Your emaill address"
						/>
						<n8n-button label="Send" float="right" @click="send" :disabled="!isEmailValid" />
					</div>
					<div :class="$style.disclaimer">Our team would contact you personally. No spam, promise!</div>
				</div>
			</section>
		</template>
	</ModalDrawer>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";
import { workflowHelpers } from "@/components/mixins/workflowHelpers";

import ModalDrawer from './ModalDrawer.vue';
import { VALUE_SURVEY_MODAL_KEY } from '../constants';


export default mixins(workflowHelpers).extend({
	name: 'ValueSurvey',
	components: {
		ModalDrawer,
	},
	computed: {
		getTitle (): string {
			if (this.form.value === 'very') {
				return this.title.very;
			} else if (this.form.value === 'somewhat') {
				return this.title.somewhat;
			} else if (this.form.value === 'not') {
				return this.title.not;
			} else {
				return this.title.default;
			}
		},
	},
	data() {
		return {
			form: {
				email: '',
				value: '',
			},
			isEmailValid: false,
			showButtons: true,
			title: {
				default: "How would you feel if you could no longer use n8n?",
				very: "Sorry to hear that. We'd love to learn how to improve. Can we reach out?",
				somewhat: "Thanks for your feedback! We'd love to understand how we can improve. Can we reach out?",
				not: "Great to hear! Can we reach out to see how we can make n8n even better for you?",
			},
			VALUE_SURVEY_MODAL_KEY,
		};
	},
	methods: {
		closeDialog(): void {
			if (!this.isEmailValid) {
				this.$telemetry.track('User responded value survey score', { instance_id: this.$store.getters.instanceId, how_disappointed: '' });
			}
			this.resetForm();
			this.$store.commit('ui/closeTopModal');
		},
		onInputChange(value: string): void {
			this.isEmailValid = this.validateEmail(value);
		},
		resetForm() {
			this.form.email = '';
			this.form.value = '';
		},
		selectSurveyValue(value: string) {
			this.form.value = value;
			this.showButtons = false;
			this.$store.dispatch('settings/submitValueSurvey', {value: this.form.value});
			this.$telemetry.track('User responded value survey score', { instance_id: this.$store.getters.instanceId, how_disappointed: this.form.value });
		},
		send(): void {
			if (this.isEmailValid) {
				this.$store.dispatch('settings/submitValueSurvey', {email: this.form.email, value: this.form.value});
				this.$telemetry.track('User responded value survey email', { instance_id: this.$store.getters.instanceId, email: this.form.email });
				this.$showMessage({
					title: 'Thanks for your feedback',
					message: "If you’d like to help even more, answer this quick survey.",
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

<style module lang="scss">
.title {
	height: 16px;
	font-size: var(--font-size-s);
	line-height: 18px;
	text-align: center;
	color: var(--color-text-xlight);
}

.content {
	display: flex;
	justify-content: center;

	.buttons {
		button {
			margin: 0 8px;
			background-color: var(--color-background-xlight);
			border: var(--color-background-xlight);
			border-radius: 4px;
			color: var(--color-background-dark);
		}
	}

	.email {
		.input {
			display: flex;

			input {
				width: 290px;
				height: 36px;
			}

			button {
				margin-left: 10px;
			}
		}

		.disclaimer {
			margin-top: var(--spacing-4xs);
			font-size: 10px;
			color: var(--color-text-xlight);
		}
	}
}
</style>

<style lang="scss">
.value-survey {
	.el-drawer {
		background: var(--color-background-dark);

		&__header {
			height: 50px;
			margin: 0;
			padding: 18px 0 16px;

			.el-dialog__close {
				font-weight: var(--font-weight-bold);
				color: var(--color-text-xlight);
			}
		}
	}
}
</style>
