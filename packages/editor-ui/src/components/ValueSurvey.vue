<template>
	<ModalDrawer
		:name="VALUE_SURVEY_MODAL_KEY"
		:beforeClose="closeDialog"
		:modal="false"
		:wrapperClosable="false"
		direction="btt"
		width="120px"
		class="value-survey"
	>
		<template slot="header">
			<span :class="$style.title" v-html="getTitle" />
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
							placeholder="Your email address"
						/>
						<n8n-button label="Send" float="right" @click="send" :disabled="!isEmailValid" />
					</div>
					<div :class="$style.disclaimer">David from our product team will get in touch personally.</div>
				</div>
			</section>
		</template>
	</ModalDrawer>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";

import { VALID_EMAIL_REGEX, VALUE_SURVEY_MODAL_KEY } from '@/constants';
import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import ModalDrawer from './ModalDrawer.vue';

const DEFAULT_TITLE = `How would you feel if you could <strong>no longer use n8n</strong>?`;
const VERY_TITLE = `Great to hear! Can we reach out to see how we can make n8n even better for you?`;
const SOMEWHAT_TITLE = `Thanks for your feedback! We'd love to understand how we can improve. Can we reach out?`;
const NOT_TITLE = `Sorry to hear that. We'd love to learn how to improve. Can we reach out?`;

export default mixins(workflowHelpers).extend({
	name: 'ValueSurvey',
	components: {
		ModalDrawer,
	},
	computed: {
		getTitle (): string {
			if (this.form.value === 'very') {
				return VERY_TITLE;
			} else if (this.form.value === 'somewhat') {
				return SOMEWHAT_TITLE;
			} else if (this.form.value === 'not') {
				return NOT_TITLE;
			} else {
				return DEFAULT_TITLE;
			}
		},
		isEmailValid(): boolean {
			return VALID_EMAIL_REGEX.test(String(this.form.email).toLowerCase());
		},
	},
	data() {
		return {
			form: {
				email: '',
				value: '',
			},
			showButtons: true,
			VALUE_SURVEY_MODAL_KEY,
		};
	},
	methods: {
		closeDialog(): void {
			if (this.form.value === '') {
				this.$telemetry.track('User responded value survey score', { instance_id: this.$store.getters.instanceId, how_disappointed: '' });
			} else if (this.form.value !== '') {
				this.$telemetry.track('User responded value survey email', { instance_id: this.$store.getters.instanceId, email: '' });
			}

			this.$store.commit('ui/closeTopModal');
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
					message: `If you’d like to help even more, answer this <a target="_blank" href="https://n8n-community.typeform.com/quicksurvey#how_disappointed=${this.form.value}&instance_id=${this.$store.getters.instanceId}">quick survey.</a>`,
					type: 'success',
					duration: 15000,
				});
				this.$store.commit('ui/closeTopModal');
			}
		},
	},
	mounted() {
		this.$telemetry.track('User shown value survey', { instance_id: this.$store.getters.instanceId});
	},
});
</script>

<style module lang="scss">
.title {
	height: 16px;
	font-size: var(--font-size-m);
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
			font-size: var(--font-size-s);
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
				font-size: var(--font-size-s);
			}
		}

		.disclaimer {
			margin-top: var(--spacing-3xs);
			font-size: var(--font-size-2xs);
			color: var(--color-text-xlight);
		}
	}
}
</style>

<style lang="scss">
.value-survey {
	height: 120px;
  top: auto;

	.el-drawer {
		background: var(--color-background-dark);

		&__header {
			height: 50px;
			margin: 0;
			padding: 18px 0 16px;

			.el-drawer__close-btn {
				top: 12px;
				right: 16px;
				position: absolute;
			}

			.el-dialog__close {
				font-weight: var(--font-weight-bold);
				color: var(--color-text-xlight);
			}
		}
	}
}
</style>
