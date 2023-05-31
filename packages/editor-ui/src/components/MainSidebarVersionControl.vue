<script lang="ts" setup>
import { useVersionControlStore } from '@/stores/versionControl.store';
import { computed, ref } from 'vue';
import { useI18n, useLoadingService, useMessage, useToast } from '@/composables';
import { useUIStore } from '@/stores';
import { VERSION_CONTROL_PUSH_MODAL_KEY } from '@/constants';
import { createEventBus } from 'n8n-design-system/utils';

const props = defineProps<{
	isCollapsed: boolean;
}>();

const loadingService = useLoadingService();
const uiStore = useUIStore();
const versionControlStore = useVersionControlStore();
const message = useMessage();
const toast = useToast();
const { i18n } = useI18n();

const eventBus = createEventBus();
const tooltipOpenDelay = ref(300);

const currentBranch = computed(() => {
	return versionControlStore.preferences.branchName;
});

async function pushWorkfolder() {
	loadingService.startLoading();
	try {
		const status = await versionControlStore.getAggregatedStatus();

		uiStore.openModalWithData({
			name: VERSION_CONTROL_PUSH_MODAL_KEY,
			data: { eventBus, status },
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	} finally {
		loadingService.stopLoading();
		loadingService.setLoadingText(i18n.baseText('genericHelpers.loading'));
	}
}

async function pullWorkfolder() {
	loadingService.startLoading();
	loadingService.setLoadingText(i18n.baseText('settings.versionControl.loading.pull'));
	try {
		await versionControlStore.pullWorkfolder(false);
	} catch (error) {
		const confirm = await message.confirm(
			i18n.baseText('settings.versionControl.modals.pull.description'),
			i18n.baseText('settings.versionControl.modals.pull.title'),
			{
				confirmButtonText: i18n.baseText('settings.versionControl.modals.pull.buttons.save'),
				cancelButtonText: i18n.baseText('settings.versionControl.modals.pull.buttons.cancel'),
			},
		);

		try {
			if (confirm === 'confirm') {
				await versionControlStore.pullWorkfolder(true);
			}
		} catch (error) {
			toast.showError(error, 'Error');
		}
	} finally {
		loadingService.stopLoading();
		loadingService.setLoadingText(i18n.baseText('genericHelpers.loading'));
	}
}
</script>

<template>
	<div :class="{ [$style.sync]: true, [$style.collapsed]: isCollapsed }">
		<span>
			<n8n-icon icon="code-branch" />
			{{ currentBranch }}
		</span>
		<div :class="{ 'pt-xs': !isCollapsed }">
			<n8n-tooltip :disabled="!isCollapsed" :open-delay="tooltipOpenDelay" placement="right">
				<template #content>
					<div>
						{{ i18n.baseText('settings.versionControl.button.pull') }}
					</div>
				</template>
				<n8n-button
					:class="{
						'mr-2xs': !isCollapsed,
						'mb-2xs': isCollapsed && !versionControlStore.preferences.branchReadOnly,
					}"
					icon="arrow-down"
					type="tertiary"
					size="mini"
					:square="isCollapsed"
					@click="pullWorkfolder"
				>
					<span v-if="!isCollapsed">{{
						i18n.baseText('settings.versionControl.button.pull')
					}}</span>
				</n8n-button>
			</n8n-tooltip>
			<n8n-tooltip
				v-if="!versionControlStore.preferences.branchReadOnly"
				:disabled="!isCollapsed"
				:open-delay="tooltipOpenDelay"
				placement="right"
			>
				<template #content>
					<div>
						{{ i18n.baseText('settings.versionControl.button.push') }}
					</div>
				</template>
				<n8n-button
					:square="isCollapsed"
					icon="arrow-up"
					type="tertiary"
					size="mini"
					@click="pushWorkfolder"
				>
					<span v-if="!isCollapsed">{{
						i18n.baseText('settings.versionControl.button.push')
					}}</span>
				</n8n-button>
			</n8n-tooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
.sync {
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) var(--spacing-l);
	margin: 0 calc(var(--spacing-l) * -1) calc(var(--spacing-m) * -1);
	background: var(--color-background-light);
	border-top: 1px solid var(--color-foreground-light);
	font-size: var(--font-size-2xs);

	span {
		color: var(--color-text-base);
	}

	button {
		font-size: var(--font-size-3xs);
	}
}

.collapsed {
	text-align: center;
	margin-left: calc(var(--spacing-xl) * -1);

	> span {
		display: none;
	}
}
</style>
