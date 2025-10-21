<script lang="ts" setup>
import CopyInput from '@/components/CopyInput.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useLoadingService } from '@/composables/useLoadingService';
import { useMessage } from '@/composables/useMessage';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useToast } from '@/composables/useToast';
import { MODAL_CONFIRM } from '@/constants';
import { useSourceControlStore } from '../sourceControl.store';
import type { SshKeyTypes, SourceControlPreferences } from '../sourceControl.types';
import type { TupleToUnion } from '@/utils/typeHelpers';
import type { Rule, RuleGroup } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import type { Validatable } from '@n8n/design-system';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { I18nT } from 'vue-i18n';

import {
	N8nActionBox,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nColorPicker,
	N8nFormInput,
	N8nHeading,
	N8nNotice,
	N8nTooltip,
} from '@n8n/design-system';
const locale = useI18n();
const sourceControlStore = useSourceControlStore();
const pageRedirectionHelper = usePageRedirectionHelper();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const loadingService = useLoadingService();

const isConnected = ref(false);
const connectionType = ref<'ssh' | 'https'>('ssh');
const httpsUsername = ref('');
const httpsPassword = ref('');

const branchNameOptions = computed(() =>
	sourceControlStore.preferences.branches.map((branch) => ({
		value: branch,
		label: branch,
	})),
);

const connectionTypeOptions = [
	{ value: 'ssh', label: 'SSH' },
	{ value: 'https', label: 'HTTPS' },
];

const onConnect = async () => {
	loadingService.startLoading();
	loadingService.setLoadingText(locale.baseText('settings.sourceControl.loading.connecting'));
	try {
		const connectionData: Partial<SourceControlPreferences> & {
			httpsUsername?: string;
			httpsPassword?: string;
		} = {
			repositoryUrl: sourceControlStore.preferences.repositoryUrl,
			connectionType: connectionType.value,
		};

		if (connectionType.value === 'https') {
			connectionData.httpsUsername = httpsUsername.value;
			connectionData.httpsPassword = httpsPassword.value;
		}

		await sourceControlStore.savePreferences(connectionData);
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
			httpsUsername.value = '';
			httpsPassword.value = '';
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
		toast.showError(error, locale.baseText('settings.sourceControl.saved.error'));
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
		connectionType.value = sourceControlStore.preferences.connectionType || 'ssh';
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
	httpsUsername: false,
	httpsPassword: false,
});

function onValidate(key: string, value: boolean) {
	formValidationStatus[key] = value;
}

const repoUrlValidationRules = computed<Array<Rule | RuleGroup>>(() => {
	const baseRules: Array<Rule | RuleGroup> = [{ name: 'REQUIRED' }];

	if (connectionType.value === 'ssh') {
		baseRules.push({
			name: 'MATCH_REGEX',
			config: {
				regex:
					/^(?:git@|ssh:\/\/git@|[\w-]+@)(?:[\w.-]+|\[[0-9a-fA-F:]+])(?::\d+)?[:\/][\w\-~.]+(?:\/[\w\-~.]+)*(?:\.git)?(?:\/.*)?$/,
				message: locale.baseText('settings.sourceControl.repoUrlInvalid'),
			},
		});
	} else {
		baseRules.push({
			name: 'MATCH_REGEX',
			config: {
				regex: /^https:\/\/.+$/,
				message: locale.baseText('settings.sourceControl.enterValidHttpsUrl'),
			},
		});
	}

	return baseRules;
});

const keyGeneratorTypeValidationRules: Array<Rule | RuleGroup> = [{ name: 'REQUIRED' }];
const httpsCredentialValidationRules: Array<Rule | RuleGroup> = [{ name: 'REQUIRED' }];

const validForConnection = computed(() => {
	if (connectionType.value === 'ssh') {
		return formValidationStatus.repoUrl;
	} else {
		return (
			formValidationStatus.repoUrl &&
			formValidationStatus.httpsUsername &&
			formValidationStatus.httpsPassword
		);
	}
});

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

watch(connectionType, () => {
	formValidationStatus.repoUrl = false;
	formValidationStatus.httpsUsername = false;
	formValidationStatus.httpsPassword = false;

	if (!isConnected.value) {
		sourceControlStore.preferences.repositoryUrl = '';
	}
});
</script>

<template>
	<div>
		<N8nHeading size="2xlarge" tag="h1">{{
			locale.baseText('settings.sourceControl.title')
		}}</N8nHeading>
		<div
			v-if="sourceControlStore.isEnterpriseSourceControlEnabled"
			data-test-id="source-control-content-licensed"
		>
			<N8nCallout theme="secondary" icon="info" class="mt-2xl mb-l">
				<I18nT keypath="settings.sourceControl.description" tag="span" scope="global">
					<template #link>
						<a :href="locale.baseText('settings.sourceControl.docs.url')" target="_blank">
							{{ locale.baseText('settings.sourceControl.description.link') }}
						</a>
					</template>
				</I18nT>
			</N8nCallout>
			<N8nHeading size="xlarge" tag="h2" class="mb-s">{{
				locale.baseText('settings.sourceControl.gitConfig')
			}}</N8nHeading>

			<div v-if="!isConnected" :class="$style.group">
				<label for="connectionType">{{
					locale.baseText('settings.sourceControl.connectionType')
				}}</label>
				<N8nFormInput
					id="connectionType"
					v-model="connectionType"
					label=""
					type="select"
					name="connectionType"
					:options="connectionTypeOptions"
					data-test-id="source-control-connection-type-select"
				/>
			</div>

			<!-- Repository URL -->
			<div :class="$style.group">
				<label for="repoUrl">
					{{
						connectionType === 'ssh'
							? locale.baseText('settings.sourceControl.sshRepoUrl')
							: locale.baseText('settings.sourceControl.httpsRepoUrl')
					}}
				</label>
				<div :class="$style.groupFlex">
					<N8nFormInput
						id="repoUrl"
						v-model="sourceControlStore.preferences.repositoryUrl"
						label=""
						class="ml-0"
						name="repoUrl"
						validate-on-blur
						:validation-rules="repoUrlValidationRules"
						:disabled="isConnected"
						:placeholder="
							connectionType === 'ssh'
								? locale.baseText('settings.sourceControl.sshRepoUrlPlaceholder')
								: locale.baseText('settings.sourceControl.httpsRepoUrlPlaceholder')
						"
						@validate="(value: boolean) => onValidate('repoUrl', value)"
					/>
					<N8nButton
						v-if="isConnected"
						:class="$style.disconnectButton"
						type="tertiary"
						size="large"
						icon="trash-2"
						data-test-id="source-control-disconnect-button"
						@click="onDisconnect"
						>{{ locale.baseText('settings.sourceControl.button.disconnect') }}</N8nButton
					>
				</div>
				<N8nNotice v-if="!isConnected && connectionType === 'ssh'" type="info" class="mt-s">
					{{ locale.baseText('settings.sourceControl.sshFormatNotice') }}
				</N8nNotice>
				<N8nNotice v-if="!isConnected && connectionType === 'https'" type="info" class="mt-s">
					{{ locale.baseText('settings.sourceControl.httpsFormatNotice') }}
				</N8nNotice>
			</div>

			<div v-if="connectionType === 'https' && !isConnected" :class="$style.group">
				<label for="httpsUsername">{{
					locale.baseText('settings.sourceControl.httpsUsername')
				}}</label>
				<N8nFormInput
					id="httpsUsername"
					v-model="httpsUsername"
					label=""
					name="httpsUsername"
					type="text"
					validate-on-blur
					:validation-rules="httpsCredentialValidationRules"
					:placeholder="locale.baseText('settings.sourceControl.httpsUsernamePlaceholder')"
					@validate="(value: boolean) => onValidate('httpsUsername', value)"
				/>
			</div>

			<div v-if="connectionType === 'https' && !isConnected" :class="$style.group">
				<label for="httpsPassword">{{
					locale.baseText('settings.sourceControl.httpsPersonalAccessToken')
				}}</label>
				<N8nFormInput
					id="httpsPassword"
					v-model="httpsPassword"
					label=""
					name="httpsPassword"
					type="password"
					validate-on-blur
					:validation-rules="httpsCredentialValidationRules"
					:placeholder="
						locale.baseText('settings.sourceControl.httpsPersonalAccessTokenPlaceholder')
					"
					@validate="(value: boolean) => onValidate('httpsPassword', value)"
				/>
				<N8nNotice type="warning" class="mt-s">
					<I18nT keypath="settings.sourceControl.httpsWarningNotice" tag="span" scope="global">
						<template #strong>
							<strong>{{
								locale.baseText('settings.sourceControl.httpsWarningNotice.strong')
							}}</strong>
						</template>
						<template #repo>
							<code>repo</code>
						</template>
						<template #publicRepo>
							<code>public_repo</code>
						</template>
					</I18nT>
				</N8nNotice>
			</div>

			<div
				v-if="connectionType === 'ssh' && sourceControlStore.preferences.publicKey"
				:class="$style.group"
			>
				<label>{{ locale.baseText('settings.sourceControl.sshKey') }}</label>
				<div :class="{ [$style.sshInput]: !isConnected }">
					<N8nFormInput
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
					<N8nButton
						v-if="!isConnected"
						size="large"
						type="tertiary"
						icon="refresh-cw"
						data-test-id="source-control-refresh-ssh-key-button"
						@click="refreshSshKey"
					>
						{{ locale.baseText('settings.sourceControl.refreshSshKey') }}
					</N8nButton>
				</div>
				<N8nNotice type="info" class="mt-s">
					<I18nT keypath="settings.sourceControl.sshKeyDescription" tag="span" scope="global">
						<template #link>
							<a
								:href="locale.baseText('settings.sourceControl.docs.setup.ssh.url')"
								target="_blank"
								>{{ locale.baseText('settings.sourceControl.sshKeyDescriptionLink') }}</a
							>
						</template>
					</I18nT>
				</N8nNotice>
			</div>
			<N8nButton
				v-if="!isConnected"
				size="large"
				:disabled="!validForConnection"
				:class="$style.connect"
				data-test-id="source-control-connect-button"
				@click="onConnect"
				>{{ locale.baseText('settings.sourceControl.button.connect') }}</N8nButton
			>

			<div v-if="isConnected" data-test-id="source-control-connected-content">
				<div :class="$style.group">
					<hr />
					<N8nHeading size="xlarge" tag="h2" class="mb-s">{{
						locale.baseText('settings.sourceControl.instanceSettings')
					}}</N8nHeading>
					<label>{{ locale.baseText('settings.sourceControl.branches') }}</label>
					<div :class="$style.branchSelection">
						<N8nFormInput
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
						<N8nTooltip placement="top">
							<template #content>
								<span>
									{{ locale.baseText('settings.sourceControl.refreshBranches.tooltip') }}
								</span>
							</template>
							<N8nButton
								size="small"
								type="tertiary"
								icon="refresh-cw"
								square
								:class="$style.refreshBranches"
								data-test-id="source-control-refresh-branches-button"
								@click="refreshBranches"
							/>
						</N8nTooltip>
					</div>
					<N8nCheckbox
						v-model="sourceControlStore.preferences.branchReadOnly"
						:class="$style.readOnly"
					>
						<I18nT keypath="settings.sourceControl.protected" tag="span" scope="global">
							<template #bold>
								<strong>{{ locale.baseText('settings.sourceControl.protected.bold') }}</strong>
							</template>
						</I18nT>
					</N8nCheckbox>
				</div>
				<div :class="$style.group">
					<label>{{ locale.baseText('settings.sourceControl.color') }}</label>
					<div>
						<N8nColorPicker v-model="sourceControlStore.preferences.branchColor" size="small" />
					</div>
				</div>
				<div :class="[$style.group, 'pt-s']">
					<N8nButton
						size="large"
						:disabled="!sourceControlStore.preferences.branchName"
						data-test-id="source-control-save-settings-button"
						@click="onSave"
						>{{ locale.baseText('settings.sourceControl.button.save') }}</N8nButton
					>
				</div>
			</div>
		</div>
		<N8nActionBox
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
		</N8nActionBox>
	</div>
</template>

<style lang="scss" module>
.group {
	padding: 0 0 var(--spacing--sm);
	width: 100%;
	display: block;

	hr {
		margin: 0 0 var(--spacing--xl);
		border: 1px solid var(--color--foreground--tint-1);
	}

	label {
		display: inline-block;
		padding: 0 0 var(--spacing--2xs);
		font-size: var(--font-size--sm);
	}

	small {
		display: inline-block;
		padding: var(--spacing--2xs) 0 0;
		font-size: var(--font-size--2xs);
		color: var(--color--text--tint-1);
	}
}

.readOnly {
	span {
		font-size: var(--font-size--sm) !important;
	}
}

.groupFlex {
	display: flex;
	align-items: flex-start;

	> div {
		flex: 1;

		&:last-child {
			margin-left: var(--spacing--2xs);
		}
	}

	input {
		width: 100%;
	}
}

.connect {
	margin: calc(var(--spacing--2xs) * -1) 0 var(--spacing--2xs);
}

.disconnectButton {
	margin: 0 0 0 var(--spacing--2xs);
	height: 40px;
}

.actionBox {
	margin: var(--spacing--2xl) 0 0;
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
		margin: 0 var(--spacing--2xs);
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
		margin-left: var(--spacing--xs);
	}
}
</style>
