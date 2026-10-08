<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref, shallowRef } from 'vue';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { applyPromotion } from '../promotionsSettings.api';
import PromotionBindingsFlow from './PromotionBindingsFlow.vue';
import type { AppliedResult, BlockedApplyResult } from '../promotions.types';

const props = defineProps<{
	open: boolean;
	connectionId: string;
	branchName: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();

const isSubmitting = ref(false);
const blockedResult = shallowRef<BlockedApplyResult>();

function close() {
	emit('update:open', false);
}

function onOpenChange(value: boolean) {
	if (value || isSubmitting.value) return;
	close();
}

function reportApplied(result: AppliedResult) {
	const { projects, workflows } = result.counts;
	const notPublished = workflows.publishing.failed + workflows.publishing.blocked;
	const interpolate = {
		projectsCreated: String(projects.created),
		projectsDeleted: String(projects.deleted),
		created: String(workflows.created),
		updated: String(workflows.updated),
		archived: String(workflows.archived),
		deleted: String(workflows.deleted),
		notPublished: String(notPublished),
	};

	// A workflow can be imported and still fail to publish, so success alone would mislead.
	toast.showMessage({
		title: i18n.baseText('settings.promotions.apply.toast.success.title'),
		message: i18n.baseText(
			notPublished
				? 'settings.promotions.apply.toast.success.messageNotPublished'
				: 'settings.promotions.apply.toast.success.message',
			{ interpolate },
		),
		type: notPublished ? 'warning' : 'success',
	});
}

// An instance apply can create and delete projects. The project sidebar is not mounted on
// this page, so reload the store it reads from instead of emitting a promotion event.
// The sidebar reads the user's own projects. Users who can list every project also read the
// full list, so reload that too.
async function refreshProjects() {
	try {
		await Promise.all([
			projectsStore.getMyProjects(),
			projectsStore.getProjectsCount(),
			...(projectsStore.globalProjectPermissions.list ? [projectsStore.getAllProjects()] : []),
		]);
	} catch {
		// The apply went through. A stale project list is fixed by the next page load.
	}
}

async function onApplied(result: AppliedResult) {
	reportApplied(result);
	close();
	await refreshProjects();
}

function reportSourceChanged() {
	toast.showMessage({
		title: i18n.baseText('settings.promotions.apply.toast.sourceChanged.title'),
		message: i18n.baseText('settings.promotions.apply.toast.sourceChanged.message', {
			interpolate: { branch: props.branchName },
		}),
		type: 'warning',
	});
}

async function submit() {
	if (isSubmitting.value) return;
	isSubmitting.value = true;
	try {
		// Whole-branch apply: no expectedSource, so the current branch tip is applied.
		const result = await applyPromotion(rootStore.publicApiContext, props.connectionId);
		if (result.status === 'applied') {
			await onApplied(result);
			return;
		}
		if (result.status === 'blocked') {
			// Hand off to the binding flow, which resumes the same whole-branch apply.
			blockedResult.value = result;
			return;
		}
		reportSourceChanged();
		close();
	} catch (error) {
		// Apply can save some changes before a later step fails, so the project list can be stale.
		toast.showError(error, i18n.baseText('settings.promotions.apply.toast.error'), {
			message: i18n.baseText('settings.promotions.apply.toast.error.message'),
		});
		void refreshProjects();
	} finally {
		isSubmitting.value = false;
	}
}

async function onBindingsApplied(result: AppliedResult) {
	blockedResult.value = undefined;
	await onApplied(result);
}

function onBindingsSourceChanged() {
	blockedResult.value = undefined;
	reportSourceChanged();
	close();
}

function onBindingsOpenChange(open: boolean) {
	if (open) return;
	blockedResult.value = undefined;
	close();
	// A failed Continue can leave part of the apply saved.
	void refreshProjects();
}
</script>

<template>
	<N8nDialog
		v-if="!blockedResult"
		:open="open"
		size="medium"
		:aria-description="
			i18n.baseText('settings.promotions.apply.dialog.ariaDescription', {
				interpolate: { branch: branchName },
			})
		"
		data-test-id="apply-instance-dialog"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText('settings.promotions.apply.dialog.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>

		<form :class="$style.form" @submit.prevent="submit">
			<N8nText color="text-base">
				{{
					i18n.baseText('settings.promotions.apply.dialog.body', {
						interpolate: { branch: branchName },
					})
				}}
			</N8nText>

			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="apply-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="submit" :loading="isSubmitting" data-test-id="apply-confirm-button">
					{{ i18n.baseText('settings.promotions.apply.dialog.confirm') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
	<PromotionBindingsFlow
		v-else
		:open="true"
		:blocked-result="blockedResult"
		:continue-with="{ kind: 'instance' }"
		@applied="onBindingsApplied"
		@source-changed="onBindingsSourceChanged"
		@update:open="onBindingsOpenChange"
	/>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
