<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router/composables';
import { createEventBus } from 'n8n-design-system/utils';
import { useI18n, useLoadingService, useMessage, useToast } from '@/composables';
import { useUIStore, useSourceControlStore } from '@/stores';
import { SOURCE_CONTROL_PUSH_MODAL_KEY, VIEWS } from '@/constants';

const props = defineProps<{
	isCollapsed: boolean;
}>();

const router = useRouter();
const loadingService = useLoadingService();
const uiStore = useUIStore();
const sourceControlStore = useSourceControlStore();
const message = useMessage();
const toast = useToast();
const { i18n } = useI18n();

const eventBus = createEventBus();
const tooltipOpenDelay = ref(300);

const currentBranch = computed(() => {
	return sourceControlStore.preferences.branchName;
});
const featureEnabled = computed(() => window.localStorage.getItem('source-control'));
const setupButtonTooltipPlacement = computed(() => (props.isCollapsed ? 'right' : 'top'));

async function pushWorkfolder() {
	loadingService.startLoading();
	try {
		const status = await sourceControlStore.getAggregatedStatus();

		uiStore.openModalWithData({
			name: SOURCE_CONTROL_PUSH_MODAL_KEY,
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
	loadingService.setLoadingText(i18n.baseText('settings.sourceControl.loading.pull'));
	try {
		await sourceControlStore.pullWorkfolder(false);
	} catch (error) {
		const errorResponse = error.response;

		if (errorResponse?.status === 409) {
			const confirm = await message.confirm(
				i18n.baseText('settings.sourceControl.modals.pull.description'),
				i18n.baseText('settings.sourceControl.modals.pull.title'),
				{
					confirmButtonText: i18n.baseText('settings.sourceControl.modals.pull.buttons.save'),
					cancelButtonText: i18n.baseText('settings.sourceControl.modals.pull.buttons.cancel'),
				},
			);

			try {
				if (confirm === 'confirm') {
					await sourceControlStore.pullWorkfolder(true);
				}
			} catch (error) {
				toast.showError(error, 'Error');
			}
		} else {
			toast.showError(error, 'Error');
		}
	} finally {
		loadingService.stopLoading();
		loadingService.setLoadingText(i18n.baseText('genericHelpers.loading'));
	}
}

const goToSourceControlSetup = async () => {
	await router.push({ name: VIEWS.SOURCE_CONTROL });
};
</script>

<template>
	<div
		v-if="featureEnabled"
		:class="{
			[$style.sync]: true,
			[$style.collapsed]: isCollapsed,
			[$style.isConnected]:
				sourceControlStore.preferences.connected && sourceControlStore.preferences.branchName,
		}"
		:style="{ borderLeftColor: sourceControlStore.preferences.branchColor }"
		data-test-id="main-sidebar-source-control"
	>
		<div
			v-if="sourceControlStore.preferences.connected && sourceControlStore.preferences.branchName"
			:class="$style.connected"
			data-test-id="main-sidebar-source-control-connected"
		>
			<span>
				<n8n-icon icon="code-branch" />
				{{ currentBranch }}
			</span>
			<div :class="{ 'pt-xs': !isCollapsed }">
				<n8n-tooltip :disabled="!isCollapsed" :open-delay="tooltipOpenDelay" placement="right">
					<template #content>
						<div>
							{{ i18n.baseText('settings.sourceControl.button.pull') }}
						</div>
					</template>
					<n8n-button
						:class="{
							'mr-2xs': !isCollapsed,
							'mb-2xs': isCollapsed && !sourceControlStore.preferences.branchReadOnly,
						}"
						icon="arrow-down"
						type="tertiary"
						size="mini"
						:square="isCollapsed"
						@click="pullWorkfolder"
					>
						<span v-if="!isCollapsed">{{
							i18n.baseText('settings.sourceControl.button.pull')
						}}</span>
					</n8n-button>
				</n8n-tooltip>
				<n8n-tooltip
					v-if="!sourceControlStore.preferences.branchReadOnly"
					:disabled="!isCollapsed"
					:open-delay="tooltipOpenDelay"
					placement="right"
				>
					<template #content>
						<div>
							{{ i18n.baseText('settings.sourceControl.button.push') }}
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
							i18n.baseText('settings.sourceControl.button.push')
						}}</span>
					</n8n-button>
				</n8n-tooltip>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.sync {
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) var(--spacing-l);
	margin: var(--spacing-2xs) 0 calc(var(--spacing-2xs) * -1);
	background: var(--color-background-light);
	border-top: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	font-size: var(--font-size-2xs);

	&.isConnected {
		padding-left: var(--spacing-m);
		border-left: var(--spacing-3xs) var(--border-style-base) var(--color-foreground-base);

		&.collapsed {
			padding-left: var(--spacing-xs);
		}
	}

	&:empty {
		display: none;
	}

	span {
		color: var(--color-text-base);
	}

	button {
		font-size: var(--font-size-3xs);
	}
}

.collapsed {
	text-align: center;
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-s);

	.connected {
		> span {
			display: none;
		}
	}
}
</style>
