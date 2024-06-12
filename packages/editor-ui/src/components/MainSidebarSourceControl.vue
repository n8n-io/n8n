<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { createEventBus } from 'n8n-design-system/utils';
import { useI18n } from '@/composables/useI18n';
import { hasPermission } from '@/utils/rbac/permissions';
import { useToast } from '@/composables/useToast';
import { useLoadingService } from '@/composables/useLoadingService';
import { useUIStore } from '@/stores/ui.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { SOURCE_CONTROL_PULL_MODAL_KEY, SOURCE_CONTROL_PUSH_MODAL_KEY, VIEWS } from '@/constants';
import type { SourceControlAggregatedFile } from '../Interface';
import { sourceControlEventBus } from '@/event-bus/source-control';

const props = defineProps<{
	isCollapsed: boolean;
}>();

const responseStatuses = {
	CONFLICT: 409,
};

const router = useRouter();
const loadingService = useLoadingService();
const uiStore = useUIStore();
const sourceControlStore = useSourceControlStore();
const toast = useToast();
const i18n = useI18n();

const eventBus = createEventBus();
const tooltipOpenDelay = ref(300);

const currentBranch = computed(() => {
	return sourceControlStore.preferences.branchName;
});
const sourceControlAvailable = computed(
	() =>
		sourceControlStore.isEnterpriseSourceControlEnabled &&
		hasPermission(['rbac'], { rbac: { scope: 'sourceControl:manage' } }),
);

async function pushWorkfolder() {
	loadingService.startLoading();
	loadingService.setLoadingText(i18n.baseText('settings.sourceControl.loading.checkingForChanges'));
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
		const status: SourceControlAggregatedFile[] =
			((await sourceControlStore.pullWorkfolder(
				false,
			)) as unknown as SourceControlAggregatedFile[]) || [];

		const statusWithoutLocallyCreatedWorkflows = status.filter((file) => {
			return !(file.type === 'workflow' && file.status === 'created' && file.location === 'local');
		});
		if (statusWithoutLocallyCreatedWorkflows.length === 0) {
			toast.showMessage({
				title: i18n.baseText('settings.sourceControl.pull.upToDate.title'),
				message: i18n.baseText('settings.sourceControl.pull.upToDate.description'),
				type: 'success',
			});
		} else {
			toast.showMessage({
				title: i18n.baseText('settings.sourceControl.pull.success.title'),
				type: 'success',
			});

			const incompleteFileTypes = ['variables', 'credential'];
			const hasVariablesOrCredentials = (status || []).some((file) => {
				return incompleteFileTypes.includes(file.type);
			});

			if (hasVariablesOrCredentials) {
				void nextTick(() => {
					toast.showMessage({
						message: i18n.baseText('settings.sourceControl.pull.oneLastStep.description'),
						title: i18n.baseText('settings.sourceControl.pull.oneLastStep.title'),
						type: 'info',
						duration: 0,
						showClose: true,
						offset: 0,
					});
				});
			}
		}
		sourceControlEventBus.emit('pull');
	} catch (error) {
		const errorResponse = error.response;

		if (errorResponse?.status === responseStatuses.CONFLICT) {
			uiStore.openModalWithData({
				name: SOURCE_CONTROL_PULL_MODAL_KEY,
				data: { eventBus, status: errorResponse.data.data },
			});
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
		v-if="sourceControlAvailable"
		:class="{
			[$style.sync]: true,
			[$style.collapsed]: isCollapsed,
			[$style.isConnected]: sourceControlStore.isEnterpriseSourceControlEnabled,
		}"
		:style="{ borderLeftColor: sourceControlStore.preferences.branchColor }"
		data-test-id="main-sidebar-source-control"
	>
		<div
			v-if="sourceControlStore.preferences.connected && sourceControlStore.preferences.branchName"
			:class="$style.connected"
			data-test-id="main-sidebar-source-control-connected"
		>
			<span :class="$style.branchName">
				<n8n-icon icon="code-branch" />
				{{ currentBranch }}
			</span>
			<div :class="{ 'pt-xs': !isCollapsed }">
				<n8n-tooltip :disabled="!isCollapsed" :show-after="tooltipOpenDelay" placement="right">
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
						:label="isCollapsed ? '' : i18n.baseText('settings.sourceControl.button.pull')"
						@click="pullWorkfolder"
					/>
				</n8n-tooltip>
				<n8n-tooltip
					v-if="!sourceControlStore.preferences.branchReadOnly"
					:disabled="!isCollapsed"
					:show-after="tooltipOpenDelay"
					placement="right"
				>
					<template #content>
						<div>
							{{ i18n.baseText('settings.sourceControl.button.push') }}
						</div>
					</template>
					<n8n-button
						:square="isCollapsed"
						:label="isCollapsed ? '' : i18n.baseText('settings.sourceControl.button.push')"
						icon="arrow-up"
						type="tertiary"
						size="mini"
						@click="pushWorkfolder"
					/>
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

	button {
		font-size: var(--font-size-3xs);
	}
}

.branchName {
	white-space: normal;
	line-break: anywhere;
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
