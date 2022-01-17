<template>
	<ModalDrawer
		:name="VALUE_SURVEY_MODAL_KEY"
		:eventBus="modalBus"
		:beforeClose="closeDialog"
		:modal="false"
		:wrapperClosable="false"
		direction="btt"
		width="120px"
		class="value-survey"
	>
		<template slot="header">
			<div :class="$style.title">
				<n8n-heading tag="h2" size="medium" color="text-xlight">{{ getTitle }}</n8n-heading>
			</div>
		</template>
		<template slot="content">
			<section :class="$style.content">
				<div v-if="showButtons" :class="$style.wrapper">
					<div :class="$style.buttons">
						<div v-for="value in 11" :key="value - 1" :class="$style.container">
							<n8n-square-button
								:label="(value - 1).toString()"
								@click="selectSurveyValue((value - 1).toString())"
							/>
						</div>
					</div>
					<div :class="$style.text">
						<n8n-text size="small" color="text-xlight">Not likely</n8n-text>
						<n8n-text size="small" color="text-xlight">Very likely</n8n-text>
					</div>
				</div>
				<div v-else :class="$style.email">
					<div :class="$style.input" @keyup.enter="send">
						<n8n-input
							v-model="form.email"
							placeholder="Your email address"
							size="medium"
							@input="onInputChange"
						/>
						<div :class="$style.button">
							<n8n-button label="Send" float="right" @click="send" :disabled="!isEmailValid" />
						</div>
					</div>
					<div :class="$style.disclaimer">
						<n8n-text size="small" color="text-xlight">
							David from our product team will get in touch personally
						</n8n-text>
					</div>
				</div>
			</section>
		</template>
	</ModalDrawer>
</template>

<script lang="ts">
import { VALID_EMAIL_REGEX, VALUE_SURVEY_MODAL_KEY } from '@/constants';
import { IN8nPromptResponse } from '@/Interface';

import ModalDrawer from './ModalDrawer.vue';

import mixins from 'vue-typed-mixins';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import Vue from 'vue';

const DEFAULT_TITLE = `How likely are you to recommend n8n to a friend or colleague?`;
const GREAT_FEEDBACK_TITLE = `Great to hear! Can we reach out to see how we can make n8n even better for you?`;
const DEFAULT_FEEDBACK_TITLE = `Thanks for your feedback! We'd love to understand how we can improve. Can we reach out?`;

export default mixins(workflowHelpers).extend({
	name: 'ValueSurvey',
	props: ['isActive'],
	components: {
		ModalDrawer,
	},
	watch: {
		isActive(isActive) {
			if (isActive) {
				this.$telemetry.track('User shown value survey', {
					instance_id: this.$store.getters.instanceId,
				});
			}
		},
	},
	computed: {
		getTitle(): string {
			if (this.form.value !== '') {
				if (Number(this.form.value) > 7) {
					return GREAT_FEEDBACK_TITLE;
				} else {
					return DEFAULT_FEEDBACK_TITLE;
				}
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
			modalBus: new Vue(),
		};
	},
	methods: {
		closeDialog(): void {
			if (this.form.value === '') {
				this.$telemetry.track('User responded value survey score', {
					instance_id: this.$store.getters.instanceId,
					nps: '',
				});
			} else {
				this.$telemetry.track('User responded value survey email', {
					instance_id: this.$store.getters.instanceId,
					email: '',
				});
			}
		},
		onInputChange(value: string) {
			this.form.email = value;
		},
		async selectSurveyValue(value: string) {
			this.form.value = value;
			this.showButtons = false;

			const response: IN8nPromptResponse = await this.$store.dispatch(
				'settings/submitValueSurvey',
				{ value: this.form.value },
			);

			if (response.updated) {
				this.$telemetry.track('User responded value survey score', {
					instance_id: this.$store.getters.instanceId,
					nps: this.form.value,
				});
			}
		},
		async send() {
			if (this.isEmailValid) {
				const response: IN8nPromptResponse = await this.$store.dispatch(
					'settings/submitValueSurvey',
					{
						email: this.form.email,
						value: this.form.value,
					},
				);

				if (response.updated) {
					this.$telemetry.track('User responded value survey email', {
						instance_id: this.$store.getters.instanceId,
						email: this.form.email,
					});
					this.$showMessage({
						title: 'Thanks for your feedback',
						message: `If you’d like to help even more, answer this <a target="_blank" href="https://n8n-community.typeform.com/quicksurvey#nps=${this.form.value}&instance_id=${this.$store.getters.instanceId}">quick survey.</a>`,
						type: 'success',
						duration: 15000,
					});
				}

				setTimeout(() => {
					this.form.value = '';
					this.form.email = '';
					this.showButtons = true;
				}, 1000);
				this.modalBus.$emit('close');
			}
		},
	},
});
</script>

<style module lang="scss">
.title {
	height: 16px;
	text-align: center;

	@media (max-width: $--breakpoint-xs) {
		margin-top: 10px;
		padding: 0 15px;
	}
}

.content {
	display: flex;
	justify-content: center;

	@media (max-width: $--breakpoint-xs) {
		margin-top: 20px;
	}
}

.wrapper {
	display: flex;
	flex-direction: column;
}

.buttons {
	display: flex;
}

.container {
	margin: 0 8px;

	@media (max-width: $--breakpoint-xs) {
		margin: 0 4px;
	}

	&:first-child {
		margin-left: 0;
	}

	&:last-child {
		margin-right: 0;
	}
}

.text {
	margin-top: 8px;
	display: flex;
	justify-content: space-between;
}

.input {
	display: flex;
	align-items: center;
}

.button {
	margin-left: 10px;
}

.disclaimer {
	margin-top: var(--spacing-4xs);
}
</style>

<style lang="scss">
.value-survey {
	height: 120px;
	top: auto;

	@media (max-width: $--breakpoint-xs) {
		height: 140px;
	}

	.el-drawer {
		background: var(--color-background-dark);

		@media (max-width: $--breakpoint-xs) {
			height: 140px !important;
		}

		&__header {
			height: 50px;
			margin: 0;
			padding: 18px 0 16px;

			.el-drawer__close-btn {
				top: 12px;
				right: 16px;
				position: absolute;

				@media (max-width: $--breakpoint-xs) {
					top: 2px;
					right: 2px;
				}
			}

			.el-dialog__close {
				font-weight: var(--font-weight-bold);
				color: var(--color-text-xlight);
			}
		}
	}
}
</style>
