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
			<div :class="$style.title">
				<n8n-heading tag="h2" size="medium" color="text-xlight">{{ getTitle }}</n8n-heading>
			</div>
		</template>
		<template slot="content">
			<section :class="$style.content">
				<div v-if="showButtons" :class="$style.wrapper">
					<div :class="$style.buttons">
						<div v-for="value in 11" :key="value - 1" :class="$style.container">
							<n8n-square-button :label="(value - 1).toString()" @click="selectSurveyValue((value - 1).toString())" />
						</div>
					</div>
					<div :class="$style.text">
						<n8n-text size="small" color="text-xlight">Not likely</n8n-text>
						<n8n-text size="small" color="text-xlight">Very likely</n8n-text>
					</div>
				</div>
				<div v-else :class="$style.email">
					<div
						:class="$style.input"
						@keyup.enter="send"
					>
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

const DEFAULT_TITLE = `How likely are you to recommend n8n to a friend or colleague?`;
const SECOND_QUESTION_TITLE = `Thanks for your feedback! We'd love to understand how we can improve. Can we reach out?`;

export default mixins(workflowHelpers).extend({
	name: 'ValueSurvey',
	components: {
		ModalDrawer,
	},
	computed: {
		getTitle(): string {
			if (this.form.value !== '') {
				return SECOND_QUESTION_TITLE;
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

			this.$store.commit('ui/closeTopModal');
		},
		onInputChange(value: string) {
			this.form.email = value;
		},
		selectSurveyValue(value: string) {
			this.form.value = value;
			this.showButtons = false;
			this.$store.dispatch('settings/submitValueSurvey', { value: this.form.value }).then((response: IN8nPromptResponse) => {
				if (response.updated) {
					this.$telemetry.track('User responded value survey score', {
						instance_id: this.$store.getters.instanceId,
						nps: this.form.value,
					});
				}
			});

		},
		send(): void {
			if (this.isEmailValid) {
				this.$store.dispatch('settings/submitValueSurvey', {
					email: this.form.email,
					value: this.form.value,
				}).then((response: IN8nPromptResponse) => {
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
						this.showButtons = true;
					}, 1000);
					this.$store.commit('ui/closeTopModal');
				});
			}
		},
	},
	mounted() {
		this.$telemetry.track('User shown value survey', {
			instance_id: this.$store.getters.instanceId,
		});
	},
});
</script>

<style module lang="scss">
.title {
	height: 16px;
	text-align: center;
}

.content {
	display: flex;
	justify-content: center;
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
