<script setup lang="ts">
/**
 * "Share" in the chat header. Only the owner of a chat in a team project sees it, until the
 * chat is shared. The confirm says what members get: the whole chat, and answers that run as
 * the owner. The button goes away after a share, so it emits `shared` for the header to move
 * the focus.
 */
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import { N8nButton, useMessage } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { MODAL_CONFIRM } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useInstanceAiStore, useThread } from '../instanceAi.store';
import { canShareThread } from './sharingView';
import { shareThread } from './threadSharing.api';
import { useThreadSharingView } from './useThreadSharing';
import { useSharingText } from './useSharingText';

const emit = defineEmits<{
	shared: [];
}>();

const thread = useThread();
const store = useInstanceAiStore();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const message = useMessage();
const toast = useToast();
const i18n = useI18n();
const text = useSharingText();
const view = useThreadSharingView(thread);

const isSharing = ref(false);
const shareButton = useTemplateRef<InstanceType<typeof N8nButton>>('shareButton');
const project = computed(() => text.project(view.value.projectName));
const canShare = computed(() =>
	canShareThread(view.value, () => projectsStore.isTeamProjectFeatureEnabled),
);

/** Shares the chat. False when the share failed: a toast says why. */
async function share(threadId: string): Promise<boolean> {
	try {
		const shared = await shareThread(rootStore.restApiContext, threadId);
		store.applyThread(shared);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('instanceAi.sharing.sharedWith', {
				interpolate: { project: text.project(shared.sharedWith?.projectName ?? '') },
			}),
		});
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.sharing.shareError'));
		// The chat can have changed meanwhile (for example a share from another tab).
		await store.refreshThread(threadId).catch(() => {});
		return false;
	}
}

async function onShare() {
	if (isSharing.value) return;
	const threadId = thread.id;
	const confirmed = await message.confirm(i18n.baseText('instanceAi.sharing.confirmMessage'), {
		title: i18n.baseText('instanceAi.sharing.confirmTitle', {
			interpolate: { project: project.value },
		}),
		confirmButtonText: i18n.baseText('instanceAi.sharing.confirmButton'),
		cancelButtonText: i18n.baseText('generic.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return;

	isSharing.value = true;
	let isShared = false;
	try {
		isShared = await share(threadId);
	} finally {
		isSharing.value = false;
	}
	if (isShared) emit('shared');
	else await restoreFocus();
}

/** The root element of N8nButton, a `<button>`. */
function buttonElement(): HTMLElement | undefined {
	const element: unknown = shareButton.value?.$el;
	return element instanceof HTMLElement ? element : undefined;
}

/** Whether the focus is on the page body or on the button, not on a control that the user chose. */
function isFocusLost(): boolean {
	const active = document.activeElement;
	return active === null || active === document.body || active === buttonElement();
}

/**
 * A loading button is disabled, and a browser then moves the focus to the page body. After a
 * share that failed, the focus goes back to the button, or to the chip when the chat is shared.
 */
async function restoreFocus(): Promise<void> {
	await nextTick();
	if (!isFocusLost()) return;
	if (canShare.value) buttonElement()?.focus();
	else if (view.value.isShared) emit('shared');
}
</script>

<template>
	<N8nButton
		v-if="canShare"
		ref="shareButton"
		variant="outline"
		size="small"
		icon="share"
		:loading="isSharing"
		:aria-label="i18n.baseText('instanceAi.sharing.shareLabel', { interpolate: { project } })"
		data-test-id="instance-ai-share-thread"
		@click="onShare"
	>
		{{ i18n.baseText('instanceAi.sharing.share') }}
	</N8nButton>
</template>
