<script setup lang="ts">
import {
	MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH,
	MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED,
	VIEWS,
} from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { MFA_SETUP_MODAL_KEY } from '../auth.constants';
import { computed, nextTick, ref, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import { useUsersStore } from '@n8n/stores/users.store';
import { useToast } from '@n8n/composables/useToast';
import QrcodeVue from 'qrcode.vue';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import router from '@/app/router';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';

// DynamicModalLoader's modal-state props must not reach the dialog root.
defineOptions({ inheritAttrs: false });

const QR_CODE_SIZE = 160;
const SECRET_GROUP_SIZE = 4;
const COPY_FEEDBACK_DURATION_MS = 2000;

type CopyTarget = 'secret' | 'recoveryCodes';

// ---------------------------------------------------------------------------
// #region Reactive properties
// ---------------------------------------------------------------------------

const secret = ref('');
const qrCode = ref('');
const showRecoveryCodes = ref(false);
const recoveryCodes = ref<string[]>([]);
const recoveryCodesSaved = ref(false);
const authenticatorCode = ref('');
const codeError = ref('');
const verifyingCode = ref(false);
const enablingMfa = ref(false);
const copiedTarget = ref<CopyTarget>();
const loadingQrCode = ref(true);
const codeInput = ref<InstanceType<typeof N8nInput> | null>(null);
const downloadButton = ref<InstanceType<typeof N8nButton> | null>(null);
const steps = useTemplateRef<HTMLElement>('steps');
const recoveryStep = useTemplateRef<HTMLElement>('recoveryStep');
// Set only while the steps swap, so the dialog glides to the next step's height.
const stepsHeight = ref<string>();

// #endregion

// ---------------------------------------------------------------------------
// #region Composable
// ---------------------------------------------------------------------------

const clipboard = useClipboard();
const uiStore = useUIStore();
const userStore = useUsersStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const toast = useToast();

// #endregion

// ---------------------------------------------------------------------------
// #region Computed
// ---------------------------------------------------------------------------

// Groups of four are easier to type into an authenticator app by hand.
const secretGroups = computed(
	() => secret.value.match(new RegExp(`.{1,${SECRET_GROUP_SIZE}}`, 'g')) ?? [],
);

const isCodeComplete = computed(() =>
	new RegExp(`^\\d{${MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH}}$`).test(authenticatorCode.value),
);

const secretCopyLabel = computed(() =>
	copiedTarget.value === 'secret'
		? i18n.baseText('mfa.setup.step1.toast.copyToClipboard.title')
		: i18n.baseText('mfa.setup.step1.secret.copy'),
);

// #endregion

// ---------------------------------------------------------------------------
// #region Methods
// ---------------------------------------------------------------------------

const closeDialog = () => {
	uiStore.closeModal(MFA_SETUP_MODAL_KEY);
};

const onOpenChange = (open: boolean) => {
	if (!open) closeDialog();
};

// The code is what the user types next, so it gets the focus instead of the copy button.
const onOpenAutoFocus = (event: Event) => {
	event.preventDefault();
	codeInput.value?.focus();
};

// Quick successive copies replace the previous toast instead of stacking toasts.
let copiedToast: ReturnType<typeof toast.showMessage> | undefined;
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;

const copyToClipboard = async (target: CopyTarget, value: string, title: string) => {
	await clipboard.copy(value);

	copiedTarget.value = target;
	clearTimeout(copyFeedbackTimer);
	copyFeedbackTimer = setTimeout(() => {
		copiedTarget.value = undefined;
	}, COPY_FEEDBACK_DURATION_MS);

	copiedToast?.close();
	copiedToast = toast.showMessage({ title, type: 'success', showClose: false });
};

const copySecret = async () => {
	await copyToClipboard(
		'secret',
		secret.value,
		i18n.baseText('mfa.setup.step1.toast.copyToClipboard.title'),
	);
};

const onSecretClick = async () => {
	// A drag selection means the user copies the key by hand.
	if (window.getSelection()?.toString()) return;
	await copySecret();
};

/**
 * The two steps differ in height. The wrapper is pinned to its current height, then to the next
 * step's height, so the dialog glides between them while the steps blur-swap (the same technique
 * as N8nCodeBlock). The pin is released once the next step has entered.
 */
const showRecoveryCodesStep = async () => {
	const wrapper = steps.value;
	if (wrapper) {
		stepsHeight.value = `${wrapper.getBoundingClientRect().height}px`;
		await nextTick();
		// Force layout so the transition starts from the pinned height.
		void wrapper.offsetHeight;
	}
	showRecoveryCodes.value = true;
	await nextTick();
	if (recoveryStep.value) {
		stepsHeight.value = `${recoveryStep.value.getBoundingClientRect().height}px`;
	}
	// The focused Continue button or code input leaves the DOM, so focus the next action.
	downloadButton.value?.$el.focus();
};

const onStepEntered = () => {
	stepsHeight.value = undefined;
};

const onContinueClick = async () => {
	if (!isCodeComplete.value || verifyingCode.value) return;

	verifyingCode.value = true;
	try {
		await userStore.verifyMfaCode({ mfaCode: authenticatorCode.value });
		await showRecoveryCodesStep();
	} catch {
		codeError.value = i18n.baseText('mfa.setup.invalidCode');
	} finally {
		verifyingCode.value = false;
	}
};

const onDownloadClick = () => {
	const filename = 'n8n-recovery-codes.txt';
	const temporalElement = document.createElement('a');
	temporalElement.setAttribute(
		'href',
		'data:text/plain;charset=utf-8,' + encodeURIComponent(recoveryCodes.value.join('\n')),
	);
	temporalElement.setAttribute('download', filename);
	temporalElement.style.display = 'none';
	document.body.appendChild(temporalElement);
	temporalElement.click();
	document.body.removeChild(temporalElement);
	recoveryCodesSaved.value = true;
};

const onCopyRecoveryCodesClick = async () => {
	await copyToClipboard(
		'recoveryCodes',
		recoveryCodes.value.join('\n'),
		i18n.baseText('mfa.setup.step2.toast.copyToClipboard.title'),
	);
	recoveryCodesSaved.value = true;
};

const onSetupClick = async () => {
	if (!recoveryCodesSaved.value || enablingMfa.value) return;

	enablingMfa.value = true;
	try {
		await userStore.enableMfa({ mfaCode: authenticatorCode.value });
		closeDialog();
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('mfa.setup.step2.toast.setupFinished.message'),
		});
		if (settingsStore.isMFAEnforced) {
			await userStore.logout();
			await router.push({ name: VIEWS.SIGNIN });
		}
	} catch (e) {
		if (e.errorCode === MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED) {
			toast.showMessage({
				type: 'error',
				title: i18n.baseText('mfa.setup.step2.toast.tokenExpired.error.message'),
			});
			return;
		}

		toast.showMessage({
			type: 'error',
			title: i18n.baseText('mfa.setup.step2.toast.setupFinished.error.message'),
		});
	} finally {
		enablingMfa.value = false;
	}
};

const getMfaQR = async () => {
	try {
		const response = await userStore.fetchMfaQR();
		qrCode.value = response.qrCode;
		secret.value = response.secret;
		recoveryCodes.value = response.recoveryCodes;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		loadingQrCode.value = false;
	}
};

// #endregion

// ---------------------------------------------------------------------------
// #region Lifecycle hooks
// ---------------------------------------------------------------------------

watch(authenticatorCode, () => {
	codeError.value = '';
});

onMounted(async () => {
	await getMfaQR();
});

onBeforeUnmount(() => clearTimeout(copyFeedbackTimer));

// #endregion
</script>

<template>
	<N8nDialog
		:open="true"
		:header="
			!showRecoveryCodes
				? i18n.baseText('mfa.setup.step1.title')
				: i18n.baseText('mfa.setup.step2.title')
		"
		size="medium"
		:container-class="$style.dialog"
		@update:open="onOpenChange"
		@open-auto-focus="onOpenAutoFocus"
	>
		<!-- Each step owns everything that changes, including its description and footer, so one measured wrapper covers the whole height change. -->
		<div
			ref="steps"
			:class="[$style.steps, { [$style.stepsResizing]: stepsHeight }]"
			:style="{ height: stepsHeight }"
			data-test-id="mfaSetup-modal"
		>
			<Transition
				:enter-active-class="$style.stepEnterActive"
				:leave-active-class="$style.stepLeaveActive"
				@after-enter="onStepEntered"
			>
				<div v-if="!showRecoveryCodes" key="setup">
					<N8nDialogBody>
						<div :class="$style.setup">
							<div :class="$style.scan">
								<div :class="$style.scanHeader">
									<N8nText tag="h3" size="medium" bold>
										{{ i18n.baseText('mfa.setup.step1.instruction1.title') }}
									</N8nText>
									<N8nText tag="p" size="small" color="text-light">
										{{ i18n.baseText('mfa.setup.step1.instruction1.description') }}
									</N8nText>
								</div>
								<div :class="[$style.inset, $style.qrCode]">
									<!-- The QR code sharpens into place while the skeleton blurs away, so it reads as the code resolving instead of popping in. -->
									<div :class="$style.qrFrame">
										<Transition
											:enter-active-class="$style.swapEnterActive"
											:leave-active-class="$style.qrLoadingLeaveActive"
										>
											<N8nLoading
												v-if="loadingQrCode"
												variant="rect"
												:class="$style.qrLoading"
												:style="{ width: `${QR_CODE_SIZE}px`, height: `${QR_CODE_SIZE}px` }"
											/>
											<QrcodeVue
												v-else
												:value="qrCode"
												:size="QR_CODE_SIZE"
												level="H"
												render-as="svg"
											/>
										</Transition>
									</div>
									<!-- The row keeps its height while the key loads, so the dialog doesn't grow when it arrives. -->
									<div :class="$style.secret">
										<Transition :enter-active-class="$style.swapEnterActive">
											<div v-if="secret" :class="$style.secretContent">
												<span
													:class="$style.secretKey"
													data-test-id="mfa-secret"
													@click="onSecretClick"
												>
													<span v-for="(group, index) in secretGroups" :key="index">{{
														group
													}}</span>
												</span>
												<N8nTooltip :content="secretCopyLabel">
													<N8nButton
														variant="ghost"
														size="small"
														icon-only
														:aria-label="secretCopyLabel"
														data-test-id="mfa-secret-button"
														@click="copySecret"
													>
														<template #icon>
															<span :class="$style.iconSwap">
																<Transition
																	:enter-active-class="$style.swapEnterActive"
																	:leave-active-class="$style.swapLeaveActive"
																>
																	<N8nIcon
																		v-if="copiedTarget === 'secret'"
																		key="check"
																		icon="check"
																		size="small"
																	/>
																	<N8nIcon v-else key="copy" icon="copy" size="small" />
																</Transition>
															</span>
														</template>
													</N8nButton>
												</N8nTooltip>
											</div>
										</Transition>
									</div>
								</div>
							</div>
							<div :class="[$style.code, { [$style.codeInvalid]: codeError }]">
								<N8nInputLabel
									input-name="mfa-setup-code"
									:label="i18n.baseText('mfa.setup.step1.instruction2.title')"
								>
									<N8nInput
										id="mfa-setup-code"
										ref="codeInput"
										v-model="authenticatorCode"
										size="medium"
										:maxlength="MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH"
										autocomplete="one-time-code"
										:placeholder="i18n.baseText('mfa.setup.step1.input.placeholder')"
										:aria-invalid="Boolean(codeError)"
										:aria-describedby="codeError ? 'mfa-setup-code-error' : undefined"
										data-test-id="mfa-token-input"
										@keydown.enter="onContinueClick"
									/>
								</N8nInputLabel>
								<N8nText
									v-if="codeError"
									id="mfa-setup-code-error"
									size="small"
									color="danger"
									role="alert"
								>
									{{ codeError }}
								</N8nText>
							</div>
						</div>
					</N8nDialogBody>
					<N8nDialogFooter>
						<N8nButton
							:disabled="!isCodeComplete"
							:loading="verifyingCode"
							data-test-id="mfa-continue-button"
							@click="onContinueClick"
						>
							{{ i18n.baseText('mfa.setup.step1.button.continue') }}
						</N8nButton>
					</N8nDialogFooter>
				</div>

				<div v-else key="recovery" ref="recoveryStep" :class="$style.recovery">
					<N8nDialogBody>
						<N8nDialogDescription>
							{{ i18n.baseText('mfa.setup.step2.description') }}
						</N8nDialogDescription>
						<ul :class="[$style.inset, $style.recoveryCodes]" data-test-id="mfa-recovery-codes">
							<li v-for="recoveryCode in recoveryCodes" :key="recoveryCode">{{ recoveryCode }}</li>
						</ul>
					</N8nDialogBody>
					<N8nDialogFooter>
						<div :class="$style.saveActions">
							<N8nButton
								variant="outline"
								data-test-id="mfa-recovery-codes-copy-button"
								@click="onCopyRecoveryCodesClick"
							>
								<template #icon>
									<span :class="$style.iconSwap">
										<Transition
											:enter-active-class="$style.swapEnterActive"
											:leave-active-class="$style.swapLeaveActive"
										>
											<N8nIcon v-if="copiedTarget === 'recoveryCodes'" key="check" icon="check" />
											<N8nIcon v-else key="copy" icon="copy" />
										</Transition>
									</span>
								</template>
								{{ i18n.baseText('mfa.setup.step2.button.copy') }}
							</N8nButton>
							<N8nButton
								ref="downloadButton"
								variant="outline"
								data-test-id="mfa-recovery-codes-button"
								@click="onDownloadClick"
							>
								<template #icon>
									<N8nIcon icon="download" />
								</template>
								{{ i18n.baseText('mfa.setup.step2.button.download') }}
							</N8nButton>
						</div>
						<N8nButton
							:disabled="!recoveryCodesSaved"
							:loading="enablingMfa"
							data-test-id="mfa-save-button"
							@click="onSetupClick"
						>
							{{ i18n.baseText('mfa.setup.step2.button.enable') }}
						</N8nButton>
					</N8nDialogFooter>
				</div>
			</Transition>
		</div>
	</N8nDialog>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

/* The QR code makes this the tallest of the account dialogs. On a short viewport it scrolls as a
   whole instead of overflowing the screen, so the code field and the footer stay reachable. */
.dialog {
	max-height: calc(100dvh - var(--spacing--lg));
	overflow-y: auto;
}

.steps {
	position: relative;
}

/* Pinned to a height only while the steps swap: clipped, so the leaving step doesn't spill past the new height. */
.stepsResizing {
	overflow: hidden;
	@include motion.height-transition;
}

.stepEnterActive {
	@include motion.blur-swap-in;
}

/* The leaving step keeps its place at the top while the next one takes over the flow. */
.stepLeaveActive {
	position: absolute;
	inset: 0 0 auto;
	@include motion.blur-swap-out;
}

.setup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding-top: var(--spacing--sm);
}

.scan {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.scanHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);

	> * {
		margin: 0;
	}
}

.inset {
	padding: var(--spacing--sm);
	border-radius: var(--radius--xs);
	background-color: light-dark(var(--color--neutral-100), var(--color--neutral-900));
}

/*
 * The key's row is as tall as its copy button, which puts the key about 24px from the bottom edge.
 * The same room above the QR code keeps the two optically balanced.
 */
.qrCode {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--lg);
}

/* QR codes need dark modules on a light background to scan, also in the dark theme. */
.qrFrame {
	position: relative;
	display: flex;
	padding: var(--spacing--xs);
	border-radius: var(--radius--3xs);
	background-color: var(--color--neutral-white);

	svg {
		display: block;
	}
}

.qrLoading {
	:global(.el-skeleton__item) {
		width: 100%;
		height: 100%;
	}
}

/* The skeleton leaves from the QR code's own spot, so the two overlap during the swap. */
.qrLoadingLeaveActive {
	position: absolute;
	inset: var(--spacing--xs);
	@include motion.blur-swap-out;
}

.secret {
	display: flex;
	justify-content: center;
	align-self: stretch;
	min-height: var(--height--sm); // the small copy button
}

/* Centre the key under the QR code and let the copy button trail it, so the button doesn't push the key off-centre. */
.secretContent {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
	width: 100%;
	column-gap: var(--spacing--4xs);

	> :last-child {
		justify-self: start;
	}
}

.secretKey {
	grid-column: 2;
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	column-gap: 0.5ch;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
	color: var(--text-color);
	cursor: pointer;
}

.code {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

/*
 * The input declares its own border variable, so an ancestor value is shadowed; target the
 * input element itself with a more specific selector to turn the border red. The input keeps
 * the focus after a failed check, so the focus border turns red too.
 */
.codeInvalid :global(.n8n-input) {
	--input--border-color: var(--color--danger);
	--input--border-color--hover: var(--color--danger);
	--input--border-color--focus: var(--color--danger);
}

/* Puts the description where the dialog header would: the header's own title–description gap. */
.recovery {
	padding-top: var(--spacing--2xs);
}

.recoveryCodes {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);
	margin: var(--spacing--sm) 0 0;
	list-style: none;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	color: var(--text-color);
}

.saveActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-inline-end: auto;
}

.iconSwap {
	--animation--blur-swap--blur: 2px;

	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.swapEnterActive {
	@include motion.blur-swap-in;
}

.swapLeaveActive {
	position: absolute;
	@include motion.blur-swap-out;
}
</style>
