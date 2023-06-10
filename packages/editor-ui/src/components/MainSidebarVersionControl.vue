<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router/composables';
import { createEventBus } from 'n8n-design-system/utils';
import { useI18n, useLoadingService, useMessage, useToast } from '@/composables';
import { useUIStore, useUsersStore, useVersionControlStore } from '@/stores';
import { VERSION_CONTROL_PUSH_MODAL_KEY, VIEWS } from '@/constants';

const props = defineProps<{
	isCollapsed: boolean;
}>();

const router = useRouter();
const loadingService = useLoadingService();
const uiStore = useUIStore();
const versionControlStore = useVersionControlStore();
const usersStore = useUsersStore();
const message = useMessage();
const toast = useToast();
const { i18n } = useI18n();

const eventBus = createEventBus();
const tooltipOpenDelay = ref(300);

const currentBranch = computed(() => {
	return versionControlStore.preferences.branchName;
});

const setupButtonTooltipPlacement = computed(() => (props.isCollapsed ? 'right' : 'top'));

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

const goToVersionControlSetup = async () => {
	await router.push({ name: VIEWS.VERSION_CONTROL });
};
</script>

<template>
	<div
		:class="{
			[$style.sync]: true,
			[$style.collapsed]: isCollapsed,
			[$style.isConnected]:
				versionControlStore.preferences.connected && versionControlStore.preferences.branchName,
		}"
		:style="{ borderLeftColor: versionControlStore.preferences.branchColor }"
		data-test-id="main-sidebar-version-control"
	>
		<div
			v-if="versionControlStore.preferences.connected && versionControlStore.preferences.branchName"
			:class="$style.connected"
			data-test-id="main-sidebar-version-control-connected"
		>
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
		<n8n-tooltip
			v-else-if="
				versionControlStore.isEnterpriseVersionControlEnabled && usersStore.isInstanceOwner
			"
			:open-delay="tooltipOpenDelay"
			:placement="setupButtonTooltipPlacement"
			data-test-id="main-sidebar-version-control-setup"
		>
			<template #content>
				<div>
					{{ i18n.baseText('settings.versionControl.button.setup.tooltip') }}
				</div>
			</template>
			<n8n-button
				icon="code-branch"
				type="tertiary"
				size="mini"
				:square="isCollapsed"
				@click="goToVersionControlSetup"
			>
				<span v-if="!isCollapsed">{{ i18n.baseText('settings.versionControl.button.setup') }}</span>
			</n8n-button>
		</n8n-tooltip>
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
