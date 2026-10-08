<script setup lang="ts">
import type { LinkedInstanceSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nEmptyState,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { MODAL_CONFIRM } from '@/app/constants';
import ChangeTokenModal from '../components/ChangeTokenModal.vue';
import LinkedInstanceRow from '../components/LinkedInstanceRow.vue';
import LinkedInstancesSkeleton from '../components/LinkedInstancesSkeleton.vue';
import LinkInstanceModal from '../components/LinkInstanceModal.vue';
import { useFocusReturn } from '../composables/useFocusReturn';
import { LINKED_INSTANCE_STATUS_DISPLAY } from '../linkedInstanceStatus';
import { useLinkedInstancesStore } from '../linkedInstances.store';

type ComponentRef = { $el?: HTMLElement };
type RowAction = 'check' | 'menu';

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const store = useLinkedInstancesStore();

const page = useTemplateRef<ComponentRef>('page');
const list = useTemplateRef<ComponentRef>('list');
const linkButton = useTemplateRef<ComponentRef>('linkButton');
const emptyState = useTemplateRef<ComponentRef>('emptyState');
const loadError = useTemplateRef<ComponentRef>('loadError');

const linkDialogOpen = ref(false);
const tokenDialogOpen = ref(false);
// Kept while the dialog closes, so its title does not change during the close animation.
const tokenTarget = ref<LinkedInstanceSummary>();
const checkingIds = ref<ReadonlySet<string>>(new Set());
const unlinkingIds = ref<ReadonlySet<string>>(new Set());
const announcement = ref('');
let announcements = 0;
// The new link, kept until its dialog has left the page.
let linked: LinkedInstanceSummary | undefined;

// Until the first read ends, the page shows a skeleton instead of an empty list.
const isFirstLoad = computed(() => !store.hasLoaded && !store.loadFailed);
const isBusy = computed(() => isFirstLoad.value || store.isLoading);

const focus = useFocusReturn(() => page.value?.$el);

function toggled(ids: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> {
	const next = new Set(ids);
	if (on) next.add(id);
	else next.delete(id);
	return next;
}

function buttonIn(component: ComponentRef | null): HTMLElement | null {
	return component?.$el?.querySelector<HTMLElement>('button') ?? null;
}

/** "Link instance" in the toolbar, or in the empty state when no row is left. */
function linkAction(): HTMLElement | null {
	return linkButton.value?.$el ?? buttonIn(emptyState.value);
}

function isListed(id: string): boolean {
	return store.instances.some((instance) => instance.id === id);
}

function rowAction(id: string, action: RowAction): HTMLElement | null {
	const rows = list.value?.$el?.querySelectorAll<HTMLElement>('[data-instance-id]') ?? [];
	const row = Array.from(rows).find((element) => element.dataset.instanceId === id);
	return row?.querySelector<HTMLElement>(`[data-action="${action}"]`) ?? null;
}

/** Moves focus only when the browser dropped it, so a user who moved on keeps their place. */
async function focusIfLost(target: () => HTMLElement | null) {
	await nextTick();
	if (document.activeElement === document.body) target()?.focus();
}

async function announce(text: string) {
	// Clear the region first, so a screen reader reads the same message again.
	// Only the latest message is shown when two overlap.
	const current = ++announcements;
	announcement.value = '';
	await nextTick();
	if (current === announcements) announcement.value = text;
}

function announceStatus(summary: LinkedInstanceSummary) {
	const { labelKey } = LINKED_INSTANCE_STATUS_DISPLAY[summary.status];
	void announce(
		i18n.baseText('settings.linkedInstances.check.result', {
			interpolate: { name: summary.name, status: i18n.baseText(labelKey) },
		}),
	);
}

/** Reads the list. The error state is not a live region, so a failure is also announced. */
async function load() {
	await store.fetchInstances();
	if (store.loadFailed) void announce(i18n.baseText('settings.linkedInstances.loadError.heading'));
}

async function retry() {
	void announce(i18n.baseText('settings.linkedInstances.loading'));
	await load();
	if (!store.loadFailed) void announce('');
	// "Try again" was removed while the list loaded. Focus goes to the next useful action.
	await focusIfLost(() => (store.loadFailed ? buttonIn(loadError.value) : linkAction()));
}

function openLinkDialog() {
	focus.remember();
	linkDialogOpen.value = true;
}

function onLinked(summary: LinkedInstanceSummary) {
	linked = summary;
}

async function onLinkDialogClosed() {
	const summary = linked;
	linked = undefined;
	// After a new link, focus goes to the new row. The button that opened the dialog can be gone.
	await focus.restore(() => (summary ? rowAction(summary.id, 'check') : null));
	if (summary) announceStatus(summary);
}

function openTokenDialog(instance: LinkedInstanceSummary) {
	focus.remember();
	tokenTarget.value = instance;
	tokenDialogOpen.value = true;
}

async function onTokenDialogClosed() {
	const id = tokenTarget.value?.id;
	// The row is gone when the server no longer had the link. Then focus goes to "Link instance".
	await focus.restore(() => (id !== undefined && isListed(id) ? null : linkAction()));
}

async function check(instance: LinkedInstanceSummary) {
	const { id } = instance;
	if (checkingIds.value.has(id) || unlinkingIds.value.has(id)) return;
	checkingIds.value = toggled(checkingIds.value, id, true);
	try {
		// No result when the row changed or went during the check.
		const summary = await store.verify(id);
		if (summary) announceStatus(summary);
	} catch (error) {
		// A fixed title: the toast title goes to telemetry, and the link name is user text.
		toast.showError(error, i18n.baseText('settings.linkedInstances.check.error'));
	} finally {
		checkingIds.value = toggled(checkingIds.value, id, false);
	}
	// The button was disabled during the check, so the browser moved focus to the page body.
	// A 404 removes the row. Then focus goes to "Link instance".
	await focusIfLost(() => rowAction(id, 'check') ?? linkAction());
}

async function confirmUnlink(instance: LinkedInstanceSummary): Promise<boolean> {
	const interpolate = { name: instance.name };
	const choice = await message.confirm(
		i18n.baseText('settings.linkedInstances.unlink.confirm.message', { interpolate }),
		i18n.baseText('settings.linkedInstances.unlink.confirm.title', { interpolate }),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('settings.linkedInstances.unlink.confirm.button'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	return choice === MODAL_CONFIRM;
}

/** @returns true when the link is gone, also when it was gone before this request */
async function sendUnlink(id: string): Promise<boolean> {
	unlinkingIds.value = toggled(unlinkingIds.value, id, true);
	try {
		await store.unlink(id);
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.linkedInstances.unlink.error'));
		return false;
	} finally {
		unlinkingIds.value = toggled(unlinkingIds.value, id, false);
	}
}

async function unlink(instance: LinkedInstanceSummary) {
	const { id, name } = instance;
	if (unlinkingIds.value.has(id) || !(await confirmUnlink(instance))) return;
	if (!(await sendUnlink(id))) {
		// The row actions were off during the request, so focus can be on the page body.
		await focusIfLost(() => rowAction(id, 'menu'));
		return;
	}
	void announce(i18n.baseText('settings.linkedInstances.unlink.done', { interpolate: { name } }));
	// The row and its menu are gone. Focus goes to "Link instance", also in the empty state,
	// unless the user moved focus during the request.
	await focusIfLost(linkAction);
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.linkedInstances.title'));
	await load();
});

// The links are per-user data. A sign-out without a page reload keeps the store, so the next
// visit starts from the skeleton and never shows the links of the previous user.
onBeforeUnmount(() => {
	store.reset();
});
</script>

<template>
	<N8nSettingsLayout ref="page" :class="$style.layout" tabindex="-1">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.linkedInstances.title')"
			:description="i18n.baseText('settings.linkedInstances.description')"
			:show-docs-link="false"
		/>

		<N8nSettingsSection :aria-busy="isBusy || undefined">
			<LinkedInstancesSkeleton v-if="isFirstLoad" />
			<N8nEmptyState
				v-else-if="store.loadFailed"
				ref="loadError"
				:heading="i18n.baseText('settings.linkedInstances.loadError.heading')"
				:description="i18n.baseText('settings.linkedInstances.loadError.description')"
				:button-text="i18n.baseText('settings.linkedInstances.loadError.tryAgain')"
				button-variant="outline"
				data-test-id="linked-instances-load-error"
				@click:button="retry"
			/>
			<N8nEmptyState
				v-else-if="store.instances.length === 0"
				ref="emptyState"
				:heading="i18n.baseText('settings.linkedInstances.empty.heading')"
				:button-text="i18n.baseText('settings.linkedInstances.link')"
				button-variant="solid"
				data-test-id="linked-instances-empty"
				@click:button="openLinkDialog"
			/>
			<template v-else>
				<div :class="$style.toolbar">
					<N8nButton
						ref="linkButton"
						variant="solid"
						:label="i18n.baseText('settings.linkedInstances.link')"
						data-test-id="linked-instances-link-button"
						@click="openLinkDialog"
					/>
				</div>
				<N8nSettingsRowGroup
					ref="list"
					role="list"
					:aria-label="i18n.baseText('settings.linkedInstances.title')"
					data-test-id="linked-instances-list"
				>
					<LinkedInstanceRow
						v-for="instance in store.instances"
						:key="instance.id"
						:instance="instance"
						:checking="checkingIds.has(instance.id)"
						:unlinking="unlinkingIds.has(instance.id)"
						@check="check(instance)"
						@change-token="openTokenDialog(instance)"
						@unlink="unlink(instance)"
					/>
				</N8nSettingsRowGroup>
			</template>
		</N8nSettingsSection>

		<!-- Last, because the layout spaces each child after the header. Not N8nVisuallyHidden:
			it sets aria-hidden, which also hides a live region. -->
		<span
			:class="$style.announcement"
			aria-live="polite"
			data-test-id="linked-instances-announcement"
			>{{ announcement }}</span
		>

		<LinkInstanceModal
			v-model:open="linkDialogOpen"
			@linked="onLinked"
			@closed="onLinkDialogClosed"
		/>
		<ChangeTokenModal
			v-model:open="tokenDialogOpen"
			:instance="tokenTarget"
			@closed="onTokenDialogClosed"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
// The settings layout supplies the top spacing.
.layout {
	padding-top: 0;

	&:focus {
		outline: none;
	}
}

.toolbar {
	display: flex;
	justify-content: flex-end;
}

.announcement {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
