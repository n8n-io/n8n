<script setup lang="ts">
import type { AppResponse, AppVersionResponse } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionDropdown,
	N8nButton,
	N8nIconButton,
	useMessage,
	type ActionDropdownItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import { publishApp, unpublishApp } from '../apps.api';
import { getAppPermissions } from '../apps.permissions';

type MenuAction = 'open' | 'copy' | 'unpublish';

const props = defineProps<{ app: AppResponse; version: AppVersionResponse | null }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const clipboard = useClipboard();
const rootStore = useRootStore();

const busy = ref(false);

const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
const isUpToDate = computed(
	() => props.version !== null && props.app.publishedVersionId === props.version.id,
);
const menuItems = computed<Array<ActionDropdownItem<MenuAction>>>(() => {
	if (!props.app.publishedUrl) return [];
	const items: Array<ActionDropdownItem<MenuAction>> = [
		{ id: 'open', label: i18n.baseText('apps.publish.openApp'), icon: 'external-link' },
		{ id: 'copy', label: i18n.baseText('apps.publish.copyUrl'), icon: 'copy' },
	];
	if (canUpdate.value) {
		items.push({
			id: 'unpublish',
			label: i18n.baseText('apps.publish.unpublish'),
			icon: 'eye-off',
			divided: true,
		});
	}
	return items;
});

async function update(request: () => Promise<AppResponse>, errorTitle: string) {
	busy.value = true;
	try {
		emit('updated', await request());
	} catch (error) {
		toast.showError(error, errorTitle);
	} finally {
		busy.value = false;
	}
}

async function publish() {
	const versionId = props.version?.id;
	if (!versionId) return;
	await update(
		async () =>
			await publishApp(rootStore.restApiContext, props.app.projectId, props.app.id, versionId),
		i18n.baseText('apps.publish.error'),
	);
}

async function unpublish() {
	const answer = await message.confirm(
		i18n.baseText('apps.publish.unpublishConfirm.message', {
			interpolate: { name: props.app.name },
		}),
		i18n.baseText('apps.publish.unpublishConfirm.title'),
		{
			confirmButtonText: i18n.baseText('apps.publish.unpublish'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);
	if (answer !== 'confirm') return;
	await update(
		async () => await unpublishApp(rootStore.restApiContext, props.app.projectId, props.app.id),
		i18n.baseText('apps.publish.unpublishError'),
	);
}

async function onMenuSelect(action: MenuAction) {
	const url = props.app.publishedUrl;
	if (!url) return;
	if (action === 'open') {
		window.open(url, '_blank', 'noopener');
	} else if (action === 'copy') {
		await clipboard.copy(url);
		toast.showMessage({ title: i18n.baseText('apps.publish.urlCopied'), type: 'success' });
	} else {
		await unpublish();
	}
}
</script>

<template>
	<div :class="{ [$style.group]: menuItems.length > 0 }" data-test-id="app-publish">
		<N8nButton
			:class="[$style.main, { [$style.published]: isUpToDate }]"
			variant="outline"
			:loading="busy"
			:disabled="!canUpdate || !version || isUpToDate"
			data-test-id="app-publish-button"
			@click="publish"
		>
			{{ i18n.baseText(isUpToDate ? 'apps.publish.published' : 'apps.publish.publish') }}
		</N8nButton>
		<N8nActionDropdown
			v-if="menuItems.length > 0"
			:items="menuItems"
			:disabled="busy"
			placement="bottom-end"
			data-test-id="app-publish-menu"
			@select="onMenuSelect"
		>
			<template #activator>
				<N8nIconButton
					:class="$style.toggle"
					variant="outline"
					icon="chevron-down"
					:disabled="busy"
					:aria-label="i18n.baseText('apps.publish.menuAriaLabel')"
					data-test-id="app-publish-menu-trigger"
				/>
			</template>
		</N8nActionDropdown>
	</div>
</template>

<style lang="scss" module>
.group {
	display: inline-flex;

	.main {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.toggle {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		border-left: none;
	}
}

.published {
	color: var(--color--text--tint-1);
}
</style>
