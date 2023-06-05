<script lang="ts" setup>
import { computed, reactive, onBeforeMount, ref } from 'vue';
import type { Rule, RuleGroup } from 'n8n-design-system/types';
import { MODAL_CONFIRM, VALID_EMAIL_REGEX } from '@/constants';
import { useVersionControlStore } from '@/stores/versionControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useToast, useMessage, useLoadingService, useI18n } from '@/composables';
import CopyInput from '@/components/CopyInput.vue';

const { i18n: locale } = useI18n();
const versionControlStore = useVersionControlStore();
const uiStore = useUIStore();
const toast = useToast();
const message = useMessage();
const loadingService = useLoadingService();

const isConnected = ref(false);

const onConnect = async () => {
	loadingService.startLoading();
	try {
		await versionControlStore.savePreferences({
			authorName: versionControlStore.preferences.authorName,
			authorEmail: versionControlStore.preferences.authorEmail,
			repositoryUrl: versionControlStore.preferences.repositoryUrl,
		});
		await versionControlStore.getBranches();
		isConnected.value = true;
		toast.showMessage({
			title: locale.baseText('settings.versionControl.toast.connected.title'),
			message: locale.baseText('settings.versionControl.toast.connected.message'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('settings.versionControl.toast.connected.error'));
	}
	loadingService.stopLoading();
};

const onDisconnect = async () => {
	try {
		const confirmation = await message.confirm(
			locale.baseText('settings.versionControl.modals.disconnect.message'),
			locale.baseText('settings.versionControl.modals.disconnect.title'),
			{
				confirmButtonText: locale.baseText('settings.versionControl.modals.disconnect.confirm'),
				cancelButtonText: locale.baseText('settings.versionControl.modals.disconnect.cancel'),
			},
		);

		if (confirmation === MODAL_CONFIRM) {
			loadingService.startLoading();
			await versionControlStore.disconnect(true);
			isConnected.value = false;
			toast.showMessage({
				title: locale.baseText('settings.versionControl.toast.disconnected.title'),
				message: locale.baseText('settings.versionControl.toast.disconnected.message'),
				type: 'success',
			});
		}
	} catch (error) {
		toast.showError(error, locale.baseText('settings.versionControl.toast.disconnected.error'));
	}
	loadingService.stopLoading();
};

const onSave = async () => {
	loadingService.startLoading();
	try {
		await Promise.all([
			versionControlStore.setBranch(versionControlStore.preferences.branchName),
			versionControlStore.setBranchReadonly(versionControlStore.preferences.branchReadOnly),
		]);
		toast.showMessage({
			title: locale.baseText('settings.versionControl.saved.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, 'Error setting branch');
	}
	loadingService.stopLoading();
};

const onSelect = async (b: string) => {
	if (b === versionControlStore.preferences.branchName) {
		return;
	}
	versionControlStore.preferences.branchName = b;
};

const goToUpgrade = () => {
	uiStore.goToUpgrade('version-control', 'upgrade-version-control');
};

onBeforeMount(async () => {
	if (versionControlStore.preferences.connected) {
		isConnected.value = true;
		void versionControlStore.getBranches();
	}
});

const formValidationStatus = reactive<Record<string, boolean>>({
	repoUrl: false,
	authorName: false,
	authorEmail: false,
});

function onValidate(key: string, value: boolean) {
	formValidationStatus[key] = value;
}

const repoUrlValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{
		name: 'MATCH_REGEX',
		config: {
			regex: /(?:git|ssh|https?|git@[-\w.]+):(\/\/)?(.*?)(\.git)(\/?|\#[-\d\w._]+?)$/,
			message: locale.baseText('settings.versionControl.repoUrlInvalid'),
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
			message: locale.baseText('settings.versionControl.authorEmailInvalid'),
		},
	},
];

const validForConnection = computed(
	() =>
		formValidationStatus.repoUrl &&
		formValidationStatus.authorName &&
		formValidationStatus.authorEmail,
);

async function refreshSshKey() {
	try {
		const confirmation = await message.confirm(
			locale.baseText('settings.versionControl.modals.refreshSshKey.message'),
			locale.baseText('settings.versionControl.modals.refreshSshKey.title'),
			{
				confirmButtonText: locale.baseText('settings.versionControl.modals.refreshSshKey.confirm'),
				cancelButtonText: locale.baseText('settings.versionControl.modals.refreshSshKey.cancel'),
			},
		);

		if (confirmation === MODAL_CONFIRM) {
			await versionControlStore.generateKeyPair();
			toast.showMessage({
				title: locale.baseText('settings.versionControl.refreshSshKey.successful.title'),
				type: 'success',
			});
		}
	} catch (error) {
		toast.showError(error, locale.baseText('settings.versionControl.refreshSshKey.error.title'));
	}
}
</script>

<template>
	<div>
		<n8n-heading size="2xlarge" tag="h1">{{
			locale.baseText('settings.versionControl.title')
		}}</n8n-heading>
		<div
			v-if="versionControlStore.isEnterpriseVersionControlEnabled"
			data-test-id="version-control-content-licensed"
		>
			<n8n-callout theme="secondary" icon="info-circle" class="mt-2xl mb-l">
				<i18n path="settings.versionControl.description">
					<template #link>
						<a href="#" target="_blank">
							{{ locale.baseText('settings.versionControl.description.link') }}
						</a>
					</template>
				</i18n>
			</n8n-callout>
			<n8n-heading size="xlarge" tag="h2" class="mb-s">{{
				locale.baseText('settings.versionControl.gitConfig')
			}}</n8n-heading>
			<div :class="$style.group">
				<label for="repoUrl">{{ locale.baseText('settings.versionControl.repoUrl') }}</label>
				<div :class="$style.groupFlex">
					<n8n-form-input
						label
						class="ml-0"
						id="repoUrl"
						name="repoUrl"
						validateOnBlur
						:validationRules="repoUrlValidationRules"
						:disabled="isConnected"
						:placeholder="locale.baseText('settings.versionControl.repoUrlPlaceholder')"
						v-model="versionControlStore.preferences.repositoryUrl"
						@validate="(value) => onValidate('repoUrl', value)"
					/>
					<n8n-button
						class="ml-2xs"
						type="tertiary"
						v-if="isConnected"
						@click="onDisconnect"
						size="large"
						icon="trash"
						>{{ locale.baseText('settings.versionControl.button.disconnect') }}</n8n-button
					>
				</div>
				<small>{{ locale.baseText('settings.versionControl.repoUrlDescription') }}</small>
			</div>
			<div :class="[$style.group, $style.groupFlex]">
				<div>
					<label for="authorName">{{
						locale.baseText('settings.versionControl.authorName')
					}}</label>
					<n8n-form-input
						label
						id="authorName"
						name="authorName"
						validateOnBlur
						:validationRules="authorNameValidationRules"
						v-model="versionControlStore.preferences.authorName"
						@validate="(value) => onValidate('authorName', value)"
					/>
				</div>
				<div>
					<label for="authorEmail">{{
						locale.baseText('settings.versionControl.authorEmail')
					}}</label>
					<n8n-form-input
						label
						type="email"
						id="authorEmail"
						name="authorEmail"
						validateOnBlur
						:validationRules="authorEmailValidationRules"
						v-model="versionControlStore.preferences.authorEmail"
						@validate="(value) => onValidate('authorEmail', value)"
					/>
				</div>
			</div>
			<div v-if="versionControlStore.preferences.publicKey" :class="$style.group">
				<label>{{ locale.baseText('settings.versionControl.sshKey') }}</label>
				<div :class="{ [$style.sshInput]: !isConnected }">
					<CopyInput
						collapse
						size="medium"
						:value="versionControlStore.preferences.publicKey"
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
						{{ locale.baseText('settings.versionControl.refreshSshKey') }}
					</n8n-button>
				</div>
				<n8n-notice type="info" class="mt-s">
					<i18n path="settings.versionControl.sshKeyDescription">
						<template #link>
							<a href="#" target="_blank">{{
								locale.baseText('settings.versionControl.sshKeyDescriptionLink')
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
				>{{ locale.baseText('settings.versionControl.button.connect') }}</n8n-button
			>
			<div v-if="isConnected">
				<div :class="$style.group">
					<hr />
					<n8n-heading size="xlarge" tag="h2" class="mb-s">{{
						locale.baseText('settings.versionControl.instanceSettings')
					}}</n8n-heading>
					<label>{{ locale.baseText('settings.versionControl.branches') }}</label>
					<n8n-select
						:value="versionControlStore.preferences.branchName"
						class="mb-s"
						size="medium"
						filterable
						@input="onSelect"
					>
						<n8n-option
							v-for="b in versionControlStore.preferences.branches"
							:key="b"
							:value="b"
							:label="b"
						/>
					</n8n-select>
					<n8n-checkbox
						v-model="versionControlStore.preferences.branchReadOnly"
						:class="$style.readOnly"
					>
						<i18n path="settings.versionControl.readonly">
							<template #bold>
								<strong>{{ locale.baseText('settings.versionControl.readonly.bold') }}</strong>
							</template>
							<template #link>
								<a href="#" target="_blank">
									{{ locale.baseText('settings.versionControl.readonly.link') }}
								</a>
							</template>
						</i18n>
					</n8n-checkbox>
				</div>
				<!-- <div :class="$style.group">
					<label>{{ locale.baseText('settings.versionControl.color') }}</label>
					<div>
						<n8n-color-picker size="small" v-model="versionControlStore.preferences.branchColor" />
					</div>
				</div> -->
				<div :class="[$style.group, 'pt-s']">
					<n8n-button
						@click="onSave"
						size="large"
						:disabled="!versionControlStore.preferences.branchName"
						>{{ locale.baseText('settings.versionControl.button.save') }}</n8n-button
					>
				</div>
			</div>
		</div>
		<n8n-action-box
			v-else
			data-test-id="version-control-content-unlicensed"
			:class="$style.actionBox"
			:description="locale.baseText('settings.versionControl.actionBox.description')"
			:buttonText="locale.baseText('settings.versionControl.actionBox.buttonText')"
			@click="goToUpgrade"
		>
			<template #heading>
				<span>{{ locale.baseText('settings.versionControl.actionBox.title') }}</span>
			</template>
		</n8n-action-box>
	</div>
</template>

<style lang="scss" module>
.group {
	padding: 0 0 var(--spacing-s);
	width: 100%;
	display: block;

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

hr {
	margin: 0 0 var(--spacing-xl);
	border: 1px solid var(--color-foreground-light);
}
</style>
