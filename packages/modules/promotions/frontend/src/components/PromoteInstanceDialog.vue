<script setup lang="ts">
import type { PromotionPromoteCheck, PromotionProviderType } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import isEqual from 'lodash/isEqual';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

import { httpUrl, notIncludedNote, warningSegments } from '../promotionResult';
import { fetchPromoteCheck, promotePackage } from '../promotionsSettings.api';
import type { PromotedResult } from '../promotions.types';
import PromotionCommitMessageField from './PromotionCommitMessageField.vue';
import PromotionMissingDependencyList from './PromotionMissingDependencyList.vue';

const props = defineProps<{
	open: boolean;
	environmentId: string;
	environmentName: string;
	baseBranchName: string;
	createBranchOnPromotion: boolean;
	providerType: PromotionProviderType;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const commitMessage = ref('');
const isSubmitting = ref(false);
const result = ref<PromotedResult | null>(null);
const messageField = useTemplateRef('messageField');

/** A Promote that found unconfirmed dependencies reports the lists, but no revision. */
type ReviewedCheck = Pick<PromotionPromoteCheck, 'missingDependencies' | 'warnings'> &
	Partial<Pick<PromotionPromoteCheck, 'revision'>>;

// The instance Promote has no preview, so the dialog reads what the Promote leaves out.
const check = ref<ReviewedCheck | null>(null);
// The check can take seconds on a large instance. It does not stop the user from promoting.
const isChecking = ref(false);
// True after a Promote that pushed nothing, because the user did not confirm the current list.
const listChanged = ref(false);
// Each load counts up, so a later load replaces the answer of an earlier one.
let generation = 0;

/** Reads the check again. Without an answer, the dialog shows `fallback`. */
async function loadCheck(fallback: ReviewedCheck | null = null) {
	const current = ++generation;
	isChecking.value = true;
	let loaded = fallback;
	try {
		loaded = await fetchPromoteCheck(rootStore.publicApiContext, props.environmentId);
	} catch {
		// The dialog then shows `fallback`. Without a list, it shows as it does when nothing is
		// missing. The Promote then sends no confirmation, and the server answers with the list.
	}
	if (current !== generation) return;
	check.value = loaded;
	isChecking.value = false;
}

watch(
	() => props.open,
	async (open) => {
		if (!open) return;
		listChanged.value = false;
		await loadCheck();
	},
	{ immediate: true },
);
// The check that the dialog shows. A check that loads again shows nothing of the one before it.
const reviewed = computed(() => (isChecking.value ? null : check.value));
// The user confirms these with the Promote. The warnings need no confirmation.
const unresolved = computed(() => reviewed.value?.missingDependencies ?? []);
const warnings = computed(() => reviewed.value?.warnings ?? []);
const unresolvedText = (
	key:
		| 'promotions.preview.unresolved.title.promote'
		| 'promotions.preview.submit.promote.unresolved',
) =>
	i18n.baseText(key, {
		adjustToNumber: unresolved.value.length,
		interpolate: { count: String(unresolved.value.length) },
	});

const dialogTitle = computed(() => {
	if (result.value) return i18n.baseText('settings.promotions.promote.dialog.result.title');
	return unresolved.value.length > 0
		? unresolvedText('promotions.preview.unresolved.title.promote')
		: i18n.baseText('settings.promotions.promote.dialog.title', {
				interpolate: { environment: props.environmentName },
			});
});

const ariaDescription = computed(() =>
	result.value
		? dialogTitle.value
		: i18n.baseText('settings.promotions.promote.dialog.ariaDescription'),
);

const bodyText = computed(() => {
	if (props.providerType === 'gitlab' && props.createBranchOnPromotion) {
		return i18n.baseText('settings.promotions.promote.dialog.body.mergeRequest', {
			interpolate: { branch: props.baseBranchName },
		});
	}
	return props.createBranchOnPromotion
		? i18n.baseText('settings.promotions.promote.dialog.body.newBranch')
		: i18n.baseText('settings.promotions.promote.dialog.body.toBranch', {
				interpolate: { branch: props.baseBranchName },
			});
});

const mergeRequestUrl = computed(() => httpUrl(result.value?.review?.webUrl));

const reviewNotRecorded = computed(() => i18n.baseText('promotions.result.reviewNotRecorded'));

const pushedText = computed(() =>
	result.value
		? i18n.baseText('promotions.result.pushed', {
				interpolate: { branch: result.value.git.branchName },
			})
		: '',
);

const notIncludedText = computed(() => (result.value ? notIncludedNote(i18n, result.value) : ''));

function close() {
	emit('update:open', false);
}

function onOpenChange(value: boolean) {
	if (value || isSubmitting.value) return;
	close();
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	void nextTick(() => messageField.value?.focus());
}

/**
 * The confirmation of the list that the dialog shows, with the revision of its check. `null` when
 * the dialog now shows a different list. The user must see that list first.
 */
async function confirmShownList() {
	const shown = unresolved.value;
	// Without a list, as while the check loads, the Promote sends no confirmation.
	if (shown.length === 0) return {};
	let revision = reviewed.value?.revision;
	if (!revision) {
		// The list of a Promote that pushed nothing has no revision. A confirmation without a
		// revision covers the list that the next Promote finds, so the check runs again first.
		const current = ++generation;
		const loaded = await fetchPromoteCheck(rootStore.publicApiContext, props.environmentId);
		if (current !== generation) return null;
		check.value = loaded;
		if (!isEqual(loaded.missingDependencies, shown)) return null;
		revision = loaded.revision;
	}
	return { confirmMissingDependencies: true, expectedPreviewRevision: revision };
}

async function submit() {
	if (isSubmitting.value) return;

	const message = commitMessage.value.trim();
	isSubmitting.value = true;
	try {
		const confirmation = await confirmShownList();
		if (!confirmation) return;
		const answer = await promotePackage(rootStore.publicApiContext, props.environmentId, {
			...(message && { commitMessage: message }),
			...confirmation,
		});
		if (answer.status === 'promoted') {
			result.value = answer;
			return;
		}
		// Nothing was pushed. The user must see the current list before the next Promote.
		listChanged.value = true;
		await loadCheck(
			answer.status === 'missing-dependencies'
				? { missingDependencies: answer.missingDependencies, warnings: answer.warnings }
				: null,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.promote.toast.error'));
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:aria-description="ariaDescription"
		data-test-id="promote-instance-dialog"
		@open-auto-focus="onOpenAutoFocus"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ dialogTitle }}
			</N8nDialogTitle>
		</N8nDialogHeader>

		<template v-if="!result">
			<N8nDialogBody>
				<form id="promote-instance-form" :class="$style.body" @submit.prevent="submit">
					<N8nText color="text-base">{{ bodyText }}</N8nText>

					<!-- The region is in the page before the list, so a list that arrives later is announced. -->
					<div
						v-if="isChecking || listChanged || unresolved.length + warnings.length > 0"
						role="status"
					>
						<div v-if="isChecking" :class="$style.checking" data-test-id="promote-check-loading">
							<N8nIcon icon="loader-circle" size="small" color="text-light" spin />
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('settings.promotions.promote.dialog.missing.checking') }}
							</N8nText>
						</div>
						<div v-else :class="$style.missing" data-test-id="promote-missing-dependencies">
							<N8nCallout
								v-if="listChanged"
								theme="warning"
								slim
								data-test-id="promote-missing-changed"
							>
								{{ i18n.baseText('settings.promotions.promote.dialog.missing.changed') }}
							</N8nCallout>
							<template v-if="unresolved.length > 0">
								<N8nText color="text-base">
									{{ i18n.baseText('promotions.preview.unresolved.body.promote') }}
								</N8nText>
								<PromotionMissingDependencyList :dependencies="unresolved" />
							</template>
							<template v-if="warnings.length > 0">
								<N8nText color="text-base">
									{{ i18n.baseText('settings.promotions.promote.dialog.missing.warnings') }}
								</N8nText>
								<PromotionMissingDependencyList :dependencies="warnings" />
							</template>
						</div>
					</div>

					<PromotionCommitMessageField
						ref="messageField"
						v-model="commitMessage"
						:disabled="isSubmitting"
					/>
				</form>
			</N8nDialogBody>
			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="promote-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					type="submit"
					form="promote-instance-form"
					:disabled="isSubmitting"
					:loading="isSubmitting"
					data-test-id="promote-confirm-button"
				>
					{{
						unresolved.length > 0
							? unresolvedText('promotions.preview.submit.promote.unresolved')
							: i18n.baseText('settings.promotions.promote.dialog.confirm')
					}}
				</N8nButton>
			</N8nDialogFooter>
		</template>

		<template v-else>
			<N8nDialogBody>
				<div :class="$style.body">
					<N8nLink
						v-if="mergeRequestUrl"
						:to="mergeRequestUrl"
						new-window
						data-test-id="promote-merge-request-link"
					>
						{{ i18n.baseText('promotions.result.viewMergeRequest') }}
					</N8nLink>
					<N8nText v-else color="text-base" data-test-id="promote-result-summary">
						{{ pushedText }}
					</N8nText>
					<N8nText
						v-if="notIncludedText"
						color="text-base"
						data-test-id="promote-result-not-included"
					>
						{{ notIncludedText }}
					</N8nText>
					<N8nText
						v-for="(warning, index) in result.warnings"
						:key="index"
						color="text-base"
						data-test-id="promote-warning"
					>
						<template
							v-for="(segment, segmentIndex) in warningSegments(warning, reviewNotRecorded)"
							:key="segmentIndex"
						>
							<N8nLink v-if="segment.kind === 'link'" :to="segment.url" new-window>
								{{ segment.url }}
							</N8nLink>
							<template v-else>{{ segment.text }}</template>
						</template>
					</N8nText>
				</div>
			</N8nDialogBody>
			<N8nDialogFooter>
				<N8nButton type="button" data-test-id="promote-close-button" @click="close">
					{{ i18n.baseText('generic.close') }}
				</N8nButton>
			</N8nDialogFooter>
		</template>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.checking {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.missing {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
