<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';

import {
	createFormEventBus,
	N8nAnimatedCollapsibleContent,
	N8nButton,
	N8nCallout,
	N8nFormInputs,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { IFormBoxConfig } from '@/Interface';
import type { EmailOrLdapLoginIdAndPassword } from '../views/SigninView.vue';

/**
 * The sign-in card for instances where SSO is the active login method.
 * "Continue with SSO" is the primary action; the email/password form sits
 * behind a disclosure so it stays one click away without inviting users to
 * type credentials that SSO would reject.
 */
const PASSWORD_FORM_ID = 'signin-password-form';

const props = withDefaults(
	defineProps<{
		form: IFormBoxConfig;
		formLoading?: boolean;
		ssoLoading?: boolean;
		/** Show the inline "your account uses SSO" callout above the password fields. */
		ssoRequired?: boolean;
		/** Start with the password form revealed, for example on `?internalAuth=true`. */
		defaultExpanded?: boolean;
	}>(),
	{
		formLoading: false,
		ssoLoading: false,
		ssoRequired: false,
		defaultExpanded: false,
	},
);

const emit = defineEmits<{
	submit: [values: EmailOrLdapLoginIdAndPassword];
	ssoLogin: [];
}>();

const i18n = useI18n();
const formBus = createFormEventBus();

const isPasswordFormOpen = ref(props.defaultExpanded);
const calloutRef = ref<{ $el?: unknown } | null>(null);

// Focus the callout when it appears so keyboard and screen-reader users land on
// the explanation right after a refused password sign-in.
watch(
	() => props.ssoRequired,
	async (ssoRequired) => {
		if (!ssoRequired) return;
		await nextTick();
		const element = calloutRef.value?.$el;
		if (element instanceof HTMLElement) element.focus({ preventScroll: true });
	},
);

const onSubmit = (values: unknown) => {
	emit('submit', values as EmailOrLdapLoginIdAndPassword);
};
</script>

<template>
	<div :class="['n8n-form-box', $style.container]" data-test-id="sso-signin-card">
		<div :class="$style.heading">
			<N8nHeading size="xlarge">{{ form.title }}</N8nHeading>
			<N8nText tag="p" size="medium" color="text-base" align="center">
				{{ i18n.baseText('sso.login.subtitle') }}
			</N8nText>
		</div>

		<N8nButton
			size="large"
			:class="$style.ssoButton"
			:label="i18n.baseText('sso.login.button')"
			:loading="ssoLoading"
			data-test-id="sso-login-button"
			@click="emit('ssoLogin')"
		/>

		<div :class="$style.divider" aria-hidden="true">
			<span>{{ i18n.baseText('sso.login.divider') }}</span>
		</div>

		<CollapsibleRoot v-model:open="isPasswordFormOpen" :class="$style.passwordSection">
			<CollapsibleTrigger as-child>
				<N8nButton
					variant="ghost"
					size="large"
					:class="$style.revealTrigger"
					:aria-controls="PASSWORD_FORM_ID"
					data-test-id="reveal-password-login"
				>
					{{ i18n.baseText('auth.signin.passwordDisclosure') }}
					<N8nIcon
						icon="chevron-down"
						size="small"
						:class="[$style.chevron, isPasswordFormOpen && $style.chevronOpen]"
					/>
				</N8nButton>
			</CollapsibleTrigger>

			<N8nAnimatedCollapsibleContent
				:id="PASSWORD_FORM_ID"
				:class="$style.passwordFormContent"
				blur
			>
				<div :class="$style.passwordForm">
					<N8nCallout
						v-if="ssoRequired"
						ref="calloutRef"
						theme="warning"
						:class="$style.callout"
						tabindex="-1"
						data-test-id="sso-required-callout"
					>
						<div :class="$style.calloutContent">
							<N8nText tag="p" size="small" color="text-base" bold>
								{{ i18n.baseText('auth.signin.ssoRequired.title') }}
							</N8nText>
							<N8nText tag="p" size="small" color="text-base">
								{{ i18n.baseText('auth.signin.ssoRequired') }}
							</N8nText>
							<N8nButton
								variant="subtle"
								size="small"
								:class="$style.calloutAction"
								:label="i18n.baseText('sso.login.button')"
								:loading="ssoLoading"
								data-test-id="sso-required-callout-action"
								@click="emit('ssoLogin')"
							/>
						</div>
					</N8nCallout>

					<div :class="$style.inputsContainer">
						<N8nFormInputs
							:inputs="form.inputs"
							:event-bus="formBus"
							:column-view="true"
							@submit="onSubmit"
						/>
					</div>
					<div :class="$style.buttonsContainer">
						<N8nButton
							variant="outline"
							size="large"
							:label="form.buttonText"
							:loading="formLoading"
							data-test-id="form-submit-button"
							@click="formBus.emit('submit')"
						/>
					</div>
					<div :class="$style.actionContainer">
						<N8nLink v-if="form.redirectText && form.redirectLink" :to="form.redirectLink">
							{{ form.redirectText }}
						</N8nLink>
					</div>
				</div>
			</N8nAnimatedCollapsibleContent>
		</CollapsibleRoot>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

// Same chrome as N8nFormBox, so the card matches the other auth pages.
.container {
	background-color: var(--color--background--light-3);
	padding: var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: 0 4px 16px rgba(99, 77, 255, 0.06);
}

.heading {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xl);

	p {
		margin: 0;
	}
}

.ssoButton {
	width: 100%;
}

.divider {
	position: relative;
	width: 100%;
	text-align: center;
	text-transform: uppercase;
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);

	&::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: 1px;
		background-color: var(--color--foreground);
	}

	span {
		position: relative;
		display: inline-block;
		margin: var(--spacing--xs) auto;
		padding: 0 var(--spacing--sm);
		background: var(--color--background--light-3);
	}
}

.passwordSection {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.revealTrigger {
	width: 100%;
	color: var(--text-color--subtle);
}

.chevron {
	margin-left: var(--spacing--4xs);
	transition: transform var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.chevronOpen {
	transform: rotate(180deg);
}

// The collapsible clips its overflow while it animates, which cut the focus
// ring of the inputs at the card edges. Widen the clip box past the ring and
// pull the content back in with matching padding.
.passwordFormContent {
	margin: 0 calc(-1 * var(--spacing--3xs));
	padding: 0 var(--spacing--3xs);
}

.passwordForm {
	padding-top: var(--spacing--sm);
}

.callout {
	margin-bottom: var(--spacing--sm);

	@include motion.fade-in-down;

	&:focus {
		outline: none;
	}

	// Top-align the icon with the callout title instead of its vertical middle.
	> div:first-child {
		align-items: flex-start;
	}
}

.calloutContent {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);

	p {
		margin: 0;
	}
}

.calloutAction {
	margin-top: var(--spacing--4xs);
}

.inputsContainer {
	margin-bottom: var(--spacing--xl);
}

.actionContainer {
	display: flex;
	justify-content: center;
}

.buttonsContainer {
	composes: actionContainer;
	margin-bottom: var(--spacing--sm);
}
</style>
