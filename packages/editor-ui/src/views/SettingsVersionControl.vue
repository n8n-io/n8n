<script lang="ts" setup>
import { ref } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import CopyInput from '@/components/CopyInput.vue';
import { useMessage } from '@/composables/useMessage';
import { useVersionControlStore } from '@/stores/versionControl';

const versionControlStore = useVersionControlStore();
const message = useMessage();
const remoteRepository = ref(versionControlStore.remoteRepository);
const selectElement = ref<HTMLSelectElement | null>(null);

const onContinue = () => {
	versionControlStore.initSsh({
		name: versionControlStore.authorName,
		email: versionControlStore.authorEmail,
		remoteRepository: remoteRepository.value,
	});
};

const onConnect = () => {
	versionControlStore.initRepository();
};

const onSelect = async (b: string) => {
	if (b === versionControlStore.currentBranch) {
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
		versionControlStore.currentBranch = b;
		selectElement.value?.blur();
	}
};

const onPull = () => {
	versionControlStore.pull();
};
</script>

<template>
	<div>
		<n8n-heading size="2xlarge">{{ locale.baseText('settings.versionControl.title') }}</n8n-heading>
		<n8n-callout theme="secondary" icon="info-circle" class="mt-2xl mb-l">{{
			locale.baseText('settings.versionControl.description')
		}}</n8n-callout>
		<div :class="$style.group">
			<label for="repoUrl">{{ locale.baseText('settings.versionControl.repoUrl') }}</label>
			<n8n-input
				id="repoUrl"
				:placeholder="locale.baseText('settings.versionControl.repoUrlPlaceholder')"
				v-model="remoteRepository"
			/>
			<small>{{ locale.baseText('settings.versionControl.repoUrlDescription') }}</small>
		</div>
		<div :class="$style.group">
			<label for="authorName">{{ locale.baseText('settings.versionControl.authorName') }}</label>
			<n8n-input id="authorName" v-model="versionControlStore.authorName" />
		</div>
		<div :class="$style.group">
			<label for="authorEmail">{{ locale.baseText('settings.versionControl.authorEmail') }}</label>
			<n8n-input id="authorEmail" v-model="versionControlStore.authorEmail" />
		</div>
		<n8n-button
			v-if="!versionControlStore.remoteRepository"
			@click="onContinue"
			size="large"
			class="mt-2xs"
			>{{ locale.baseText('settings.versionControl.button.continue') }}</n8n-button
		>
		<div v-if="versionControlStore.remoteRepository" :class="$style.group">
			<label>{{ locale.baseText('settings.versionControl.sshKey') }}</label>
			<CopyInput
				:value="versionControlStore.sshPublicKey"
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
			v-if="!versionControlStore.branches.length && versionControlStore.remoteRepository"
			@click="onConnect"
			size="large"
			:class="$style.connect"
			>{{ locale.baseText('settings.versionControl.button.connect') }}</n8n-button
		>
		<div v-if="versionControlStore.branches.length" :class="$style.group">
			<label>{{ locale.baseText('settings.versionControl.branches') }}</label>
			<n8n-select
				ref="selectElement"
				class="mb-s"
				:value="versionControlStore.currentBranch"
				size="medium"
				filterable
				@input="onSelect"
			>
				<n8n-option v-for="b in versionControlStore.branches" :key="b" :value="b" :label="b" />
			</n8n-select>
			<n8n-button @click="onPull" size="large">{{
				locale.baseText('settings.versionControl.button.pull')
			}}</n8n-button>
		</div>
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
</style>
