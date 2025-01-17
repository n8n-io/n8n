<script lang="ts" setup>
import { computed, h, nextTick, ref } from 'vue';
import { createEventBus } from 'n8n-design-system/utils';
import { useI18n } from '@/composables/useI18n';
import { hasPermission } from '@/utils/rbac/permissions';
import { useToast } from '@/composables/useToast';
import { useLoadingService } from '@/composables/useLoadingService';
import { useUIStore } from '@/stores/ui.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { SOURCE_CONTROL_PULL_MODAL_KEY, SOURCE_CONTROL_PUSH_MODAL_KEY } from '@/constants';
import { sourceControlEventBus } from '@/event-bus/source-control';
import { groupBy } from 'lodash-es';
import { RouterLink } from 'vue-router';
import { VIEWS } from '@/constants';
import type { SourceControlledFile } from '@n8n/api-types';

defineProps<{
	isCollapsed: boolean;
}>();

const responseStatuses = {
	CONFLICT: 409,
};

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

		if (!status.length) {
			toast.showMessage({
				title: 'No changes to commit',
				message: 'Everything is up to date',
				type: 'info',
			});
			return;
		}

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

const variablesToast = {
	title: i18n.baseText('settings.sourceControl.pull.upToDate.variables.title'),
	message: h(RouterLink, { to: { name: VIEWS.VARIABLES } }, () =>
		i18n.baseText('settings.sourceControl.pull.upToDate.variables.description'),
	),
	type: 'info' as const,
	closeOnClick: true,
	duration: 0,
};

const credentialsToast = {
	title: i18n.baseText('settings.sourceControl.pull.upToDate.credentials.title'),
	message: h(RouterLink, { to: { name: VIEWS.CREDENTIALS, query: { setupNeeded: 'true' } } }, () =>
		i18n.baseText('settings.sourceControl.pull.upToDate.credentials.description'),
	),
	type: 'info' as const,
	closeOnClick: true,
	duration: 0,
};

const pullMessage = ({
	credential,
	tags,
	variables,
	workflow,
}: Partial<Record<SourceControlledFile['type'], SourceControlledFile[]>>) => {
	const messages: string[] = [];

	if (workflow?.length) {
		messages.push(
			i18n.baseText('generic.workflow', {
				adjustToNumber: workflow.length,
				interpolate: { count: workflow.length },
			}),
		);
	}

	if (credential?.length) {
		messages.push(
			i18n.baseText('generic.credential', {
				adjustToNumber: credential.length,
				interpolate: { count: credential.length },
			}),
		);
	}

	if (variables?.length) {
		messages.push(i18n.baseText('generic.variable_plural'));
	}

	if (tags?.length) {
		messages.push(i18n.baseText('generic.tag_plural'));
	}

	return [
		new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' }).format(messages),
		'were pulled',
	].join(' ');
};

async function pullWorkfolder() {
	loadingService.startLoading();
	loadingService.setLoadingText(i18n.baseText('settings.sourceControl.loading.pull'));

	try {
		const status = await sourceControlStore.pullWorkfolder(false);

		if (!status.length) {
			toast.showMessage({
				title: i18n.baseText('settings.sourceControl.pull.upToDate.title'),
				message: i18n.baseText('settings.sourceControl.pull.upToDate.description'),
				type: 'success',
			});
			return;
		}

		const { credential, tags, variables, workflow } = groupBy(status, 'type');

		const toastMessages = [
			...(variables?.length ? [variablesToast] : []),
			...(credential?.length ? [credentialsToast] : []),
			{
				title: i18n.baseText('settings.sourceControl.pull.success.title'),
				message: pullMessage({ credential, tags, variables, workflow }),
				type: 'success' as const,
			},
		];

		for (const message of toastMessages) {
			/**
			 * the toasts stack in a reversed way, resulting in
			 * Success
			 * Credentials
			 * Variables
			 */
			//
			toast.showToast(message);
			await nextTick();
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
