<script lang="ts" setup>
import { computed, reactive, ref, onMounted } from 'vue';
import type { Rule, RuleGroup } from 'n8n-design-system/types';
import { MODAL_CONFIRM, VALID_EMAIL_REGEX } from '@/constants';
import { useUIStore, useSourceControlStore } from '@/stores';
import { useToast, useMessage, useLoadingService, useI18n } from '@/composables';
import CopyInput from '@/components/CopyInput.vue';

const { i18n: locale } = useI18n();
const sourceControlStore = useSourceControlStore();
const uiStore = useUIStore();
const toast = useToast();
const message = useMessage();
const loadingService = useLoadingService();

const sourceControlDocsSetupUrl = computed(() =>
	locale.baseText('settings.sourceControl.docs.setup.url'),
);
const isConnected = ref(false);
const branchNameOptions = computed(() =>
	sourceControlStore.preferences.branches.map((branch) => ({
		value: branch,
		label: branch,
	})),
);

const onConnect = async () => {
	loadingService.startLoading();
	try {
		await sourceControlStore.savePreferences({
			authorName: sourceControlStore.preferences.authorName,
			authorEmail: sourceControlStore.preferences.authorEmail,
			repositoryUrl: sourceControlStore.preferences.repositoryUrl,
		});
		await sourceControlStore.getBranches();
		isConnected.value = true;
		toast.showMessage({
			title: locale.baseText('settings.sourceControl.toast.connected.title'),
			message: locale.baseText('settings.sourceControl.toast.connected.message'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.toast.connected.error'));
	}
	loadingService.stopLoading();
};

const onDisconnect = async () => {
	try {
		const confirmation = await message.confirm(
			locale.baseText('settings.sourceControl.modals.disconnect.message'),
			locale.baseText('settings.sourceControl.modals.disconnect.title'),
			{
				confirmButtonText: locale.baseText('settings.sourceControl.modals.disconnect.confirm'),
				cancelButtonText: locale.baseText('settings.sourceControl.modals.disconnect.cancel'),
			},
		);

		if (confirmation === MODAL_CONFIRM) {
			loadingService.startLoading();
			await sourceControlStore.disconnect(true);
			isConnected.value = false;
			toast.showMessage({
				title: locale.baseText('settings.sourceControl.toast.disconnected.title'),
				message: locale.baseText('settings.sourceControl.toast.disconnected.message'),
				type: 'success',
			});
		}
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.toast.disconnected.error'));
	}
	loadingService.stopLoading();
};

const onSave = async () => {
	loadingService.startLoading();
	try {
		await sourceControlStore.updatePreferences({
			branchName: sourceControlStore.preferences.branchName,
			branchReadOnly: sourceControlStore.preferences.branchReadOnly,
			branchColor: sourceControlStore.preferences.branchColor,
		});
		toast.showMessage({
			title: locale.baseText('settings.sourceControl.saved.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, 'Error setting branch');
	}
	loadingService.stopLoading();
};

const onSelect = async (b: string) => {
	if (b === sourceControlStore.preferences.branchName) {
		return;
	}
	sourceControlStore.preferences.branchName = b;
};

const goToUpgrade = () => {
	uiStore.goToUpgrade('source-control', 'upgrade-source-control');
};

const initialize = async () => {
	await sourceControlStore.getPreferences();
	if (sourceControlStore.preferences.connected) {
		isConnected.value = true;
		void sourceControlStore.getBranches();
	}
};

onMounted(async () => {
	await initialize();
});

const formValidationStatus = reactive<Record<string, boolean>>({
	repoUrl: false,
	authorName: false,
	authorEmail: false,
	branchName: false,
});

function onValidate(key: string, value: boolean) {
	formValidationStatus[key] = value;
}

const repoUrlValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{
		name: 'MATCH_REGEX',
		config: {
			regex: /^(?!https?:\/\/)(?:git|ssh|git@[-\w.]+):(\/\/)?(.*?)(\.git)(\/?|\#[-\d\w._]+?)$/,
			message: locale.baseText('settings.sourceControl.repoUrlInvalid'),
		},
	},
];

const authorNameValidationRules: Array<Rule | RuleGroup> = [{ name: 'REQUIRED' }];

const authorEmailValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{
		name: 'MATCH_REGEX',
		config: {
			regex: VALID_EMAIL_REGEX,
			message: locale.baseText('settings.sourceControl.authorEmailInvalid'),
		},
	},
];

const branchNameValidationRules: Array<Rule | RuleGroup> = [{ name: 'REQUIRED' }];

const validForConnection = computed(
	() =>
		formValidationStatus.repoUrl &&
		formValidationStatus.authorName &&
		formValidationStatus.authorEmail,
);

async function refreshSshKey() {
	try {
		const confirmation = await message.confirm(
			locale.baseText('settings.sourceControl.modals.refreshSshKey.message'),
			locale.baseText('settings.sourceControl.modals.refreshSshKey.title'),
			{
				confirmButtonText: locale.baseText('settings.sourceControl.modals.refreshSshKey.confirm'),
				cancelButtonText: locale.baseText('settings.sourceControl.modals.refreshSshKey.cancel'),
			},
		);

		if (confirmation === MODAL_CONFIRM) {
			await sourceControlStore.generateKeyPair();
			toast.showMessage({
				title: locale.baseText('settings.sourceControl.refreshSshKey.successful.title'),
				type: 'success',
			});
		}
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.refreshSshKey.error.title'));
	}
}

const refreshBranches = async () => {
	try {
		await sourceControlStore.getBranches();
		toast.showMessage({
			title: locale.baseText('settings.sourceControl.refreshBranches.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.refreshBranches.error'));
	}
};
</script>

<template>
	<div>
		<n8n-heading size="2xlarge" tag="h1">{{
			locale.baseText('settings.sourceControl.title')
		}}</n8n-heading>
		<div
			v-if="sourceControlStore.isEnterpriseSourceControlEnabled"
			data-test-id="source-control-content-licensed"
		>
			<n8n-callout theme="secondary" icon="info-circle" class="mt-2xl mb-l">
				<i18n path="settings.sourceControl.description">
					<template #link>
						<a :href="sourceControlDocsSetupUrl" target="_blank">
							{{ locale.baseText('settings.sourceControl.description.link') }}
						</a>
					</template>
				</i18n>
			</n8n-callout>
			<n8n-heading size="xlarge" tag="h2" class="mb-s">{{
				locale.baseText('settings.sourceControl.gitConfig')
			}}</n8n-heading>
			<div :class="$style.group">
				<label for="repoUrl">{{ locale.baseText('settings.sourceControl.repoUrl') }}</label>
				<div :class="$style.groupFlex">
					<n8n-form-input
						label
						class="ml-0"
						id="repoUrl"
						name="repoUrl"
						validateOnBlur
						:validationRules="repoUrlValidationRules"
						:disabled="isConnected"
						:placeholder="locale.baseText('settings.sourceControl.repoUrlPlaceholder')"
						v-model="sourceControlStore.preferences.repositoryUrl"
						@validate="(value) => onValidate('repoUrl', value)"
					/>
					<n8n-button
						:class="$style.disconnectButton"
						type="tertiary"
						v-if="isConnected"
						@click="onDisconnect"
						size="large"
						icon="trash"
						data-test-id="source-control-disconnect-button"
						>{{ locale.baseText('settings.sourceControl.button.disconnect') }}</n8n-button
					>
				</div>
			</div>
			<div :class="[$style.group, $style.groupFlex]">
				<div>
					<label for="authorName">{{ locale.baseText('settings.sourceControl.authorName') }}</label>
					<n8n-form-input
						label
						id="authorName"
						name="authorName"
						validateOnBlur
						:validationRules="authorNameValidationRules"
						v-model="sourceControlStore.preferences.authorName"
						@validate="(value) => onValidate('authorName', value)"
					/>
				</div>
				<div>
					<label for="authorEmail">{{
						locale.baseText('settings.sourceControl.authorEmail')
					}}</label>
					<n8n-form-input
						label
						type="email"
						id="authorEmail"
						name="authorEmail"
						validateOnBlur
						:validationRules="authorEmailValidationRules"
						v-model="sourceControlStore.preferences.authorEmail"
						@validate="(value) => onValidate('authorEmail', value)"
					/>
				</div>
			</div>
			<div v-if="sourceControlStore.preferences.publicKey" :class="$style.group">
				<label>{{ locale.baseText('settings.sourceControl.sshKey') }}</label>
				<div :class="{ [$style.sshInput]: !isConnected }">
					<CopyInput
						collapse
						size="medium"
						:value="sourceControlStore.preferences.publicKey"
						:copy-button-text="locale.baseText('generic.clickToCopy')"
					/>
					<n8n-button
						v-if="!isConnected"
						size="large"
						type="tertiary"
						icon="sync"
						class="ml-s"
						@click="refreshSshKey"
					>
						{{ locale.baseText('settings.sourceControl.refreshSshKey') }}
					</n8n-button>
				</div>
				<n8n-notice type="info" class="mt-s">
					<i18n path="settings.sourceControl.sshKeyDescription">
						<template #link>
							<a :href="sourceControlDocsSetupUrl" target="_blank">{{
								locale.baseText('settings.sourceControl.sshKeyDescriptionLink')
							}}</a>
						</template>
					</i18n>
				</n8n-notice>
			</div>
			<n8n-button
				v-if="!isConnected"
				@click="onConnect"
				size="large"
				:disabled="!validForConnection"
				:class="$style.connect"
				data-test-id="source-control-connect-button"
				>{{ locale.baseText('settings.sourceControl.button.connect') }}</n8n-button
			>
			<div v-if="isConnected" data-test-id="source-control-connected-content">
				<div :class="$style.group">
					<hr />
					<n8n-heading size="xlarge" tag="h2" class="mb-s">{{
						locale.baseText('settings.sourceControl.instanceSettings')
					}}</n8n-heading>
					<label>{{ locale.baseText('settings.sourceControl.branches') }}</label>
					<div :class="$style.branchSelection">
						<n8n-form-input
							label
							type="select"
							id="branchName"
							name="branchName"
							class="mb-s"
							data-test-id="source-control-branch-select"
							validateOnBlur
							:validationRules="branchNameValidationRules"
							:options="branchNameOptions"
							:value="sourceControlStore.preferences.branchName"
							@validate="(value) => onValidate('branchName', value)"
							@input="onSelect"
						/>
						<n8n-tooltip placement="top">
							<template #content>
								<span>
									{{ locale.baseText('settings.sourceControl.refreshBranches.tooltip') }}
								</span>
							</template>
							<n8n-button
								size="small"
								type="tertiary"
								icon="sync"
								square
								:class="$style.refreshBranches"
								@click="refreshBranches"
								data-test-id="source-control-refresh-branches-button"
							/>
						</n8n-tooltip>
					</div>
					<n8n-checkbox
						v-model="sourceControlStore.preferences.branchReadOnly"
						:class="$style.readOnly"
					>
						<i18n path="settings.sourceControl.readonly">
							<template #bold>
								<strong>{{ locale.baseText('settings.sourceControl.readonly.bold') }}</strong>
							</template>
							<template #link>
								<a :href="sourceControlDocsSetupUrl" target="_blank">
									{{ locale.baseText('settings.sourceControl.readonly.link') }}
								</a>
							</template>
						</i18n>
					</n8n-checkbox>
				</div>
				<div :class="$style.group">
					<label>{{ locale.baseText('settings.sourceControl.color') }}</label>
					<div>
						<n8n-color-picker size="small" v-model="sourceControlStore.preferences.branchColor" />
					</div>
				</div>
				<div :class="[$style.group, 'pt-s']">
					<n8n-button
						@click="onSave"
						size="large"
						:disabled="!sourceControlStore.preferences.branchName"
						data-test-id="source-control-save-settings-button"
						>{{ locale.baseText('settings.sourceControl.button.save') }}</n8n-button
					>
				</div>
			</div>
		</div>
		<n8n-action-box
			v-else
			data-test-id="source-control-content-unlicensed"
			:class="$style.actionBox"
			:description="locale.baseText('settings.sourceControl.actionBox.description')"
			:buttonText="locale.baseText('settings.sourceControl.actionBox.buttonText')"
			@click="goToUpgrade"
		>
			<template #heading>
				<span>{{ locale.baseText('settings.sourceControl.actionBox.title') }}</span>
			</template>
			<template #description>
				{{ locale.baseText('settings.sourceControl.actionBox.description') }}
				<a :href="locale.baseText('settings.sourceControl.docs.url')" target="_blank">
					{{ locale.baseText('settings.sourceControl.actionBox.description.link') }}
				</a>
			</template>
		</n8n-action-box>
	</div>
</template>

<style lang="scss" module>
.group {
	padding: 0 0 var(--spacing-s);
	width: 100%;
	display: block;

	hr {
		margin: 0 0 var(--spacing-xl);
		border: 1px solid var(--color-foreground-light);
	}

	label {
		display: inline-block;
		padding: 0 0 var(--spacing-2xs);
		font-size: var(--font-size-s);
	}

	small {
		display: inline-block;
		padding: var(--spacing-2xs) 0 0;
		font-size: var(--font-size-2xs);
		color: var(--color-text-light);
	}
}

.readOnly {
	span {
		font-size: var(--font-size-s) !important;
	}
}

.groupFlex {
	display: flex;
	align-items: flex-start;

	> div {
		flex: 1;

		&:last-child {
			margin-left: var(--spacing-2xs);
		}
	}

	input {
		width: 100%;
	}
}

.connect {
	margin: calc(var(--spacing-2xs) * -1) 0 var(--spacing-2xs);
}

.disconnectButton {
	margin: 0 0 0 var(--spacing-2xs);
	height: 40px;
}

.actionBox {
	margin: var(--spacing-2xl) 0 0;
}

.sshInput {
	width: 100%;
	display: flex;
	align-items: center;

	> div {
		width: calc(100% - 144px - var(--spacing-s));
	}

	> button {
		height: 42px;
	}
}

.branchSelection {
	display: flex;

	> div:first-child {
		flex: 1;

		input {
			height: 36px;
		}
	}

	button.refreshBranches {
		height: 36px;
		width: 36px;
		margin-left: var(--spacing-xs);
	}
}
</style>
