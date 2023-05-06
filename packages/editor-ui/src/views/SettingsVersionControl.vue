<script lang="ts" setup>
import { computed, ref } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import { useVersionControlStore } from '@/stores/versionControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useMessage } from '@/composables';

const versionControlStore = useVersionControlStore();
const uiStore = useUIStore();
const message = useMessage();

const sshKey = computed(() => versionControlStore.state.sshKey);
const branch = computed(() => versionControlStore.state.currentBranch);
const branches = ref<string[]>([]);
const selectElement = ref<HTMLSelectElement | null>(null);

const onContinue = () => {
	versionControlStore.initSsh({
		name: versionControlStore.state.authorName,
		email: versionControlStore.state.authorEmail,
		remoteRepository: versionControlStore.state.repositoryUrl,
	});
};

const onConnect = () => {
	versionControlStore.initRepository();
};

const onSelect = async (b: string) => {
	if (b === branch.value) {
		return;
	}
	const switchBranch = await message
		.confirm(
			locale.baseText('settings.versionControl.switchBranch.description', {
				interpolate: { branch: b },
			}),
			locale.baseText('settings.versionControl.switchBranch.title', { interpolate: { branch: b } }),
		)
		.catch(() => {});
	if (switchBranch === 'confirm') {
		versionControlStore.state.currentBranch = b;
		selectElement.value?.blur();
	}
};

const goToUpgrade = () => {
	uiStore.goToUpgrade('version-control', 'upgrade-version-control');
};
</script>

<template>
	<div>
		<n8n-heading size="2xlarge">{{ locale.baseText('settings.versionControl.title') }}</n8n-heading>
		<div
			v-if="versionControlStore.isEnterpriseVersionControlEnabled"
			data-test-id="version-control-content-licensed"
		>
			<n8n-callout theme="secondary" icon="info-circle" class="mt-2xl mb-l">{{
				locale.baseText('settings.versionControl.description')
			}}</n8n-callout>
			<div :class="$style.group">
				<label for="repoUrl">{{ locale.baseText('settings.versionControl.repoUrl') }}</label>
				<n8n-input
					id="repoUrl"
					:placeholder="locale.baseText('settings.versionControl.repoUrlPlaceholder')"
					v-model="versionControlStore.state.repositoryUrl"
				/>
				<small>{{ locale.baseText('settings.versionControl.repoUrlDescription') }}</small>
			</div>
			<div :class="$style.group">
				<label for="authorName">{{ locale.baseText('settings.versionControl.authorName') }}</label>
				<n8n-input id="authorName" v-model="versionControlStore.state.authorName" />
			</div>
			<div :class="$style.group">
				<label for="authorEmail">{{
					locale.baseText('settings.versionControl.authorEmail')
				}}</label>
				<n8n-input id="authorEmail" v-model="versionControlStore.state.authorEmail" />
			</div>
			<n8n-button v-if="!sshKey" @click="onContinue" size="large" class="mt-2xs">{{
				locale.baseText('settings.versionControl.button.continue')
			}}</n8n-button>
			<div v-if="sshKey" :class="$style.group">
				<label>{{ locale.baseText('settings.versionControl.sshKey') }}</label>
				<CopyInput
					:value="versionControlStore.state.sshKey"
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
			<n8n-button v-if="sshKey" @click="onConnect" size="large" :class="$style.connect">{{
				locale.baseText('settings.versionControl.button.connect')
			}}</n8n-button>
			<div v-if="versionControlStore.state.branches.length" :class="$style.group">
				<label>{{ locale.baseText('settings.versionControl.branches') }}</label>
				<n8n-select
					ref="selectElement"
					:value="versionControlStore.state.currentBranch"
					size="medium"
					filterable
					@input="onSelect"
				>
					<n8n-option
						v-for="b in versionControlStore.state.branches"
						:key="b"
						:value="b"
						:label="b"
					/>
				</n8n-select>
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
	padding: 0 0 var(--spacing-2xs);

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

.connect {
	margin: calc(var(--spacing-2xs) * -1) 0 var(--spacing-2xs);
}

.actionBox {
	margin: var(--spacing-2xl) 0 0;
}
</style>
