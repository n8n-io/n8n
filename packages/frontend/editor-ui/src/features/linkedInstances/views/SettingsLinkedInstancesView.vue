<script setup lang="ts">
import type { LinkedInstanceSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nEmptyState,
	N8nLoading2,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { MODAL_CONFIRM } from '@/app/constants';
import ChangeTokenModal from '../components/ChangeTokenModal.vue';
import LinkedInstanceRow from '../components/LinkedInstanceRow.vue';
import LinkInstanceModal from '../components/LinkInstanceModal.vue';
import { useFocusReturn } from '../composables/useFocusReturn';
import { LINKED_INSTANCE_STATUS_DISPLAY } from '../linkedInstanceStatus';
import { useLinkedInstancesStore } from '../linkedInstances.store';

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const store = useLinkedInstancesStore();

const page = useTemplateRef<{ $el?: HTMLElement }>('page');
const list = useTemplateRef<{ $el?: HTMLElement }>('list');
const linkButton = useTemplateRef<{ $el?: HTMLElement }>('linkButton');

const linkDialogOpen = ref(false);
const tokenDialogOpen = ref(false);
// Kept while the dialog closes, so its title does not change during the close animation.
const tokenTarget = ref<LinkedInstanceSummary>();
const checkingIds = ref<ReadonlySet<string>>(new Set());
const announcement = ref('');
let linkedId: string | undefined;

// Until the first read ends, the page shows a skeleton instead of an empty list.
const isFirstLoad = computed(() => !store.hasLoaded && !store.loadFailed);
const isBusy = computed(() => isFirstLoad.value || store.isLoading);

const focus = useFocusReturn(() => page.value?.$el);

function rowCheckButton(id: string): HTMLElement | null {
	const rows = list.value?.$el?.querySelectorAll<HTMLElement>('[data-instance-id]') ?? [];
	const row = Array.from(rows).find((element) => element.dataset.instanceId === id);
	return row?.querySelector<HTMLElement>('[data-action="check"]') ?? null;
}

async function announce(text: string) {
	// Clear the region first, so a screen reader reads the same message again.
	announcement.value = '';
	await nextTick();
	announcement.value = text;
}

function announceStatus(summary: LinkedInstanceSummary) {
	const { labelKey } = LINKED_INSTANCE_STATUS_DISPLAY[summary.status];
	void announce(
		i18n.baseText('settings.linkedInstances.check.result', {
			interpolate: { name: summary.name, status: i18n.baseText(labelKey) },
		}),
	);
}

function openLinkDialog() {
	focus.remember();
	linkDialogOpen.value = true;
}

function onLinked(summary: LinkedInstanceSummary) {
	linkedId = summary.id;
	announceStatus(summary);
}

async function onLinkDialogOpenChange(open: boolean) {
	linkDialogOpen.value = open;
	if (open) return;
	// After a new link, focus goes to the new row. The button that opened the dialog can be gone.
	const id = linkedId;
	linkedId = undefined;
	await focus.restore(() => (id ? rowCheckButton(id) : null));
}

function openTokenDialog(instance: LinkedInstanceSummary) {
	focus.remember();
	tokenTarget.value = instance;
	tokenDialogOpen.value = true;
}

async function onTokenDialogOpenChange(open: boolean) {
	tokenDialogOpen.value = open;
	if (!open) await focus.restore();
}

function setChecking(id: string, checking: boolean) {
	const next = new Set(checkingIds.value);
	if (checking) next.add(id);
	else next.delete(id);
	checkingIds.value = next;
}

async function check(instance: LinkedInstanceSummary) {
	if (checkingIds.value.has(instance.id)) return;
	setChecking(instance.id, true);
	try {
		announceStatus(await store.verify(instance.id));
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('settings.linkedInstances.check.error', {
				interpolate: { name: instance.name },
			}),
		);
	} finally {
		setChecking(instance.id, false);
	}
	// The button was disabled during the check, so the browser moved focus to the page body.
	await nextTick();
	if (document.activeElement === document.body) rowCheckButton(instance.id)?.focus();
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

async function unlink(instance: LinkedInstanceSummary) {
	if (!(await confirmUnlink(instance))) return;
	const interpolate = { name: instance.name };
	try {
		await store.unlink(instance.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.linkedInstances.unlink.error', { interpolate }));
		return;
	}
	void announce(i18n.baseText('settings.linkedInstances.unlink.done', { interpolate }));
	// The row and its menu are gone. Focus goes to "Link instance", or to the page when no row is left.
	await focus.restore(() => linkButton.value?.$el);
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.linkedInstances.title'));
	await store.fetchInstances();
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
			<N8nLoading2 v-if="isFirstLoad" :rows="3" :shrink-last="false" />
			<N8nEmptyState
				v-else-if="store.loadFailed"
				:heading="i18n.baseText('settings.linkedInstances.loadError.heading')"
				:description="i18n.baseText('settings.linkedInstances.loadError.description')"
				:button-text="i18n.baseText('settings.linkedInstances.loadError.tryAgain')"
				button-variant="outline"
				data-test-id="linked-instances-load-error"
				@click:button="store.fetchInstances()"
			/>
			<N8nEmptyState
				v-else-if="store.instances.length === 0"
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
				<N8nSettingsRowGroup ref="list" data-test-id="linked-instances-list">
					<LinkedInstanceRow
						v-for="instance in store.instances"
						:key="instance.id"
						:instance="instance"
						:checking="checkingIds.has(instance.id)"
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
			:open="linkDialogOpen"
			@update:open="onLinkDialogOpenChange"
			@linked="onLinked"
		/>
		<ChangeTokenModal
			:open="tokenDialogOpen"
			:instance="tokenTarget"
			@update:open="onTokenDialogOpenChange"
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
