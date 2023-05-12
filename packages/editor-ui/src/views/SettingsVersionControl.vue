<script lang="ts" setup>
import { i18n as locale } from '@/plugins/i18n';
import { useVersionControlStore } from '@/stores/versionControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useMessage } from '@/composables';
import CopyInput from '@/components/CopyInput.vue';

const versionControlStore = useVersionControlStore();
const uiStore = useUIStore();
const message = useMessage();

const onContinue = () => {
	void versionControlStore.initSsh({
		name: versionControlStore.state.authorName,
		email: versionControlStore.state.authorEmail,
		remoteRepository: versionControlStore.state.repositoryUrl,
	});
};

const onConnect = () => {
	void versionControlStore.initRepository();
};

const onSave = () => {
	void versionControlStore.savePreferences(versionControlStore.preferences);
};

const onSelect = async (b: string) => {
	if (b === versionControlStore.preferences.currentBranch) {
		return;
	}
	versionControlStore.preferences.currentBranch = b;
};

const goToUpgrade = () => {
	uiStore.goToUpgrade('version-control', 'upgrade-version-control');
};
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
				<n8n-input
					id="repoUrl"
					:placeholder="locale.baseText('settings.versionControl.repoUrlPlaceholder')"
					v-model="versionControlStore.preferences.repositoryUrl"
				/>
				<small>{{ locale.baseText('settings.versionControl.repoUrlDescription') }}</small>
			</div>
			<div :class="[$style.group, $style.groupFlex]">
				<div>
					<label for="authorName">{{
						locale.baseText('settings.versionControl.authorName')
					}}</label>
					<n8n-input id="authorName" v-model="versionControlStore.preferences.authorName" />
				</div>
				<div>
					<label for="authorEmail">{{
						locale.baseText('settings.versionControl.authorEmail')
					}}</label>
					<n8n-input id="authorEmail" v-model="versionControlStore.preferences.authorEmail" />
				</div>
			</div>
			<n8n-button
				v-if="!versionControlStore.preferences.publicKey"
				@click="onContinue"
				size="large"
				class="mt-2xs"
				>{{ locale.baseText('settings.versionControl.button.continue') }}</n8n-button
			>
			<div v-if="versionControlStore.preferences.publicKey" :class="$style.group">
				<label>{{ locale.baseText('settings.versionControl.sshKey') }}</label>
				<CopyInput
					:value="versionControlStore.preferences.publicKey"
					:copy-button-text="locale.baseText('generic.clickToCopy')"
				/>
				<n8n-notice type="info" class="mt-s">
					<i18n path="settings.versionControl.sshKeyDescription">
						<template #link>
							<a href="#" target="_blank">
								{{ locale.baseText('settings.versionControl.sshKeyDescriptionLink') }}
							</a>
						</template>
					</i18n>
				</n8n-notice>
			</div>
			<n8n-button
				v-if="
					versionControlStore.preferences.publicKey &&
					!versionControlStore.preferences.branches.length
				"
				@click="onConnect"
				size="large"
				:class="$style.connect"
				>{{ locale.baseText('settings.versionControl.button.connect') }}</n8n-button
			>
			<div v-if="versionControlStore.preferences.branches.length">
				<div :class="$style.group">
					<hr />
					<n8n-heading size="xlarge" tag="h2" class="mb-s">{{
						locale.baseText('settings.versionControl.instanceSettings')
					}}</n8n-heading>
					<label>{{ locale.baseText('settings.versionControl.branches') }}</label>
					<n8n-select
						:value="versionControlStore.preferences.currentBranch"
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
				<div :class="$style.group">
					<label>{{ locale.baseText('settings.versionControl.color') }}</label>
					<div>
						<n8n-color-picker size="small" v-model="versionControlStore.preferences.branchColor" />
					</div>
				</div>
				<div :class="[$style.group, 'pt-s']">
					<n8n-button
						v-if="
							versionControlStore.preferences.publicKey &&
							versionControlStore.preferences.currentBranch
						"
						@click="onSave"
						size="large"
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

hr {
	margin: 0 0 var(--spacing-xl);
	border: 1px solid var(--color-foreground-light);
}
</style>
