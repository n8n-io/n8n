<script lang="ts" setup>
import CopyInput from '@/components/CopyInput.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useLoadingService } from '@/composables/useLoadingService';
import { useMessage } from '@/composables/useMessage';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useToast } from '@/composables/useToast';
import { MODAL_CONFIRM } from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import type { SshKeyTypes } from '@/types/sourceControl.types';
import type { TupleToUnion } from '@/utils/typeHelpers';
import type { Rule, RuleGroup } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import type { Validatable } from '@n8n/design-system';
import { computed, onMounted, reactive, ref } from 'vue';
import { I18nT } from 'vue-i18n';

const locale = useI18n();
const sourceControlStore = useSourceControlStore();
const pageRedirectionHelper = usePageRedirectionHelper();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const loadingService = useLoadingService();

const isConnected = ref(false);
const branchNameOptions = computed(() =>
	sourceControlStore.preferences.branches.map((branch) => ({
		value: branch,
		label: branch,
	})),
);

const onConnect = async () => {
	loadingService.startLoading();
	loadingService.setLoadingText(locale.baseText('settings.sourceControl.loading.connecting'));
	try {
		await sourceControlStore.savePreferences({
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

const onSelect = (b: Validatable) => {
	if (b === sourceControlStore.preferences.branchName) {
		return;
	}
	sourceControlStore.preferences.branchName = b as string;
};

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('source-control', 'upgrade-source-control');
};

const initialize = async () => {
	await sourceControlStore.getPreferences();
	if (sourceControlStore.preferences.connected) {
		isConnected.value = true;
		void sourceControlStore.getBranches();
	}
};

onMounted(async () => {
	documentTitle.set(locale.baseText('settings.sourceControl.title'));
	if (!sourceControlStore.isEnterpriseSourceControlEnabled) return;
	await initialize();
});

const formValidationStatus = reactive<Record<string, boolean>>({
	repoUrl: false,
	keyGeneratorType: false,
});

function onValidate(key: string, value: boolean) {
	formValidationStatus[key] = value;
}

const repoUrlValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{
		name: 'MATCH_REGEX',
		config: {
			regex:
				/^(?:git@|ssh:\/\/git@|[\w-]+@)(?:[\w.-]+|\[[0-9a-fA-F:]+])(?::\d+)?[:\/][\w\-~.]+(?:\/[\w\-~.]+)*(?:\.git)?(?:\/.*)?$/,
			message: locale.baseText('settings.sourceControl.repoUrlInvalid'),
		},
	},
];

const keyGeneratorTypeValidationRules: Array<Rule | RuleGroup> = [{ name: 'REQUIRED' }];

const validForConnection = computed(() => formValidationStatus.repoUrl);
const branchNameValidationRules: Array<Rule | RuleGroup> = [{ name: 'REQUIRED' }];

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
			await sourceControlStore.generateKeyPair(sourceControlStore.preferences.keyGeneratorType);
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

const onSelectSshKeyType = (value: Validatable) => {
	const sshKeyType = value as TupleToUnion<SshKeyTypes>;
	if (sshKeyType === sourceControlStore.preferences.keyGeneratorType) {
		return;
	}
	sourceControlStore.preferences.keyGeneratorType = sshKeyType;
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
			<n8n-callout theme="secondary" icon="info" class="mt-2xl mb-l">
				<I18nT keypath="settings.sourceControl.description" tag="span" scope="global">
					<template #link>
						<a :href="locale.baseText('settings.sourceControl.docs.url')" target="_blank">
							{{ locale.baseText('settings.sourceControl.description.link') }}
						</a>
					</template>
				</I18nT>
			</n8n-callout>
			<n8n-heading size="xlarge" tag="h2" class="mb-s">{{
				locale.baseText('settings.sourceControl.gitConfig')
			}}</n8n-heading>
			<div :class="$style.group">
				<label for="repoUrl">{{ locale.baseText('settings.sourceControl.repoUrl') }}</label>
				<div :class="$style.groupFlex">
					<n8n-form-input
						id="repoUrl"
						v-model="sourceControlStore.preferences.repositoryUrl"
						label=""
						class="ml-0"
						name="repoUrl"
						validate-on-blur
						:validation-rules="repoUrlValidationRules"
						:disabled="isConnected"
						:placeholder="locale.baseText('settings.sourceControl.repoUrlPlaceholder')"
						@validate="(value: boolean) => onValidate('repoUrl', value)"
					/>
					<n8n-button
						v-if="isConnected"
						:class="$style.disconnectButton"
						type="tertiary"
						size="large"
						icon="trash-2"
						data-test-id="source-control-disconnect-button"
						@click="onDisconnect"
						>{{ locale.baseText('settings.sourceControl.button.disconnect') }}</n8n-button
					>
				</div>
			</div>
			<div v-if="sourceControlStore.preferences.publicKey" :class="$style.group">
				<label>{{ locale.baseText('settings.sourceControl.sshKey') }}</label>
				<div :class="{ [$style.sshInput]: !isConnected }">
					<n8n-form-input
						v-if="!isConnected"
						id="keyGeneratorType"
						:class="$style.sshKeyTypeSelect"
						label=""
						type="select"
						name="keyGeneratorType"
						data-test-id="source-control-ssh-key-type-select"
						validate-on-blur
						:validation-rules="keyGeneratorTypeValidationRules"
						:options="sourceControlStore.sshKeyTypesWithLabel"
						:model-value="sourceControlStore.preferences.keyGeneratorType"
						@validate="(value: boolean) => onValidate('keyGeneratorType', value)"
						@update:model-value="onSelectSshKeyType"
					/>
					<CopyInput
						:class="$style.copyInput"
						collapse
						size="medium"
						:value="sourceControlStore.preferences.publicKey"
						:copy-button-text="locale.baseText('generic.clickToCopy')"
					/>
					<n8n-button
						v-if="!isConnected"
						size="large"
						type="tertiary"
						icon="refresh-cw"
						data-test-id="source-control-refresh-ssh-key-button"
						@click="refreshSshKey"
					>
						{{ locale.baseText('settings.sourceControl.refreshSshKey') }}
					</n8n-button>
				</div>
				<n8n-notice type="info" class="mt-s">
					<I18nT keypath="settings.sourceControl.sshKeyDescription" tag="span" scope="global">
						<template #link>
							<a
								:href="locale.baseText('settings.sourceControl.docs.setup.ssh.url')"
								target="_blank"
								>{{ locale.baseText('settings.sourceControl.sshKeyDescriptionLink') }}</a
							>
						</template>
					</I18nT>
				</n8n-notice>
			</div>
			<n8n-button
				v-if="!isConnected"
				size="large"
				:disabled="!validForConnection"
				:class="$style.connect"
				data-test-id="source-control-connect-button"
				@click="onConnect"
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
							id="branchName"
							label=""
							type="select"
							name="branchName"
							class="mb-s"
							data-test-id="source-control-branch-select"
							validate-on-blur
							:validation-rules="branchNameValidationRules"
							:options="branchNameOptions"
							:model-value="sourceControlStore.preferences.branchName"
							@validate="(value: boolean) => onValidate('branchName', value)"
							@update:model-value="onSelect"
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
								icon="refresh-cw"
								square
								:class="$style.refreshBranches"
								data-test-id="source-control-refresh-branches-button"
								@click="refreshBranches"
							/>
						</n8n-tooltip>
					</div>
					<n8n-checkbox
						v-model="sourceControlStore.preferences.branchReadOnly"
						:class="$style.readOnly"
					>
						<I18nT keypath="settings.sourceControl.protected" tag="span" scope="global">
							<template #bold>
								<strong>{{ locale.baseText('settings.sourceControl.protected.bold') }}</strong>
							</template>
						</I18nT>
					</n8n-checkbox>
				</div>
				<div :class="$style.group">
					<label>{{ locale.baseText('settings.sourceControl.color') }}</label>
					<div>
						<n8n-color-picker v-model="sourceControlStore.preferences.branchColor" size="small" />
					</div>
				</div>
				<div :class="[$style.group, 'pt-s']">
					<n8n-button
						size="large"
						:disabled="!sourceControlStore.preferences.branchName"
						data-test-id="source-control-save-settings-button"
						@click="onSave"
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
			:button-text="locale.baseText('settings.sourceControl.actionBox.buttonText')"
			@click:button="goToUpgrade"
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
		flex: 1 1 auto;
	}

	> button {
		height: 42px;
	}

	.copyInput {
		margin: 0 var(--spacing-2xs);
	}
}

.sshKeyTypeSelect {
	min-width: 120px;
}

.copyInput {
	overflow: auto;
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
