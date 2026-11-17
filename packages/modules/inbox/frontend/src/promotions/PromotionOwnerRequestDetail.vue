<script setup lang="ts">
import type { InboxPromotionOwnerRequestItem } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nHeading,
	N8nIcon,
	N8nText,
	type BadgeVariant,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { InboxItemChange } from '../inbox.constants';
import { formatUserDisplayName, toError } from '../reviews/workflowReviews.utils';
import {
	ownerRequestIcon,
	ownerRequestOutcome,
	type OwnerRequestOutcome,
} from './promotionOwnerRequest.utils';
import { dismissPromotionOwnerRequest } from './promotionOwnerRequests.api';

const props = defineProps<{
	item: InboxPromotionOwnerRequestItem;
	onItemChange: (change: InboxItemChange) => void;
}>();
const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const { showError } = useToast();

const outcomeBadge: Record<OwnerRequestOutcome, BadgeVariant> = {
	open: 'info',
	promoted: 'success',
	applied: 'success',
	dismissed: 'subtle',
	closed: 'subtle',
};

const outcome = computed(() => ownerRequestOutcome(props.item));
const requesterName = computed(
	() =>
		formatUserDisplayName(props.item.requester) ||
		i18n.baseText('inbox.promotionOwnerRequest.requester.unknown'),
);
const kindLabel = computed(() =>
	i18n.baseText(`inbox.promotionOwnerRequest.kind.${props.item.resource.kind}`),
);
const interpolate = computed(() => ({
	name: props.item.resource.name,
	requester: requesterName.value,
	environment: props.item.environment.name,
	project: props.item.ownerProject?.name ?? '',
}));

const why = computed(() =>
	i18n.baseText(
		`inbox.promotionOwnerRequest.detail.why.${props.item.operation}.${props.item.resource.kind}`,
		{ interpolate: interpolate.value },
	),
);
const closedMessage = computed(() => {
	switch (outcome.value) {
		case 'promoted':
		case 'applied':
		case 'dismissed':
			return i18n.baseText(`inbox.promotionOwnerRequest.detail.closed.${outcome.value}`, {
				interpolate: interpolate.value,
			});
		default:
			return i18n.baseText('inbox.promotionOwnerRequest.detail.closed.closed');
	}
});

/** The preview of the owner project, with the requested resource open. */
function openOperation() {
	const { ownerProject, operation, resourceKey, resource } = props.item;
	if (!ownerProject) return;
	void router.push({
		path: `/projects/${encodeURIComponent(ownerProject.id)}/promotions/${operation}`,
		query: { resource: resourceKey ?? `${resource.kind}:${resource.id}` },
	});
}

/** An Apply of the whole instance creates a project that this instance does not have. */
function openInstanceApply() {
	void router.push({ path: '/promotions/apply' });
}

/** The request the user confirms. A later change of the selected row does not change it. */
const pendingDismiss = ref<{ id: string } | null>(null);
const dismissing = ref(false);

function closeDismiss() {
	if (!dismissing.value) pendingDismiss.value = null;
}

async function onDismiss() {
	if (!pendingDismiss.value || dismissing.value) return;
	const { id } = pendingDismiss.value;
	// The Inbox can reconcile this result after the viewer selects another item.
	const onItemChange = props.onItemChange;
	dismissing.value = true;
	try {
		const { state, updatedAt } = await dismissPromotionOwnerRequest(rootStore.restApiContext, id);
		onItemChange({ type: 'promotion_owner_request', id, state, updatedAt, advance: true });
	} catch (error: unknown) {
		showError(toError(error), i18n.baseText('inbox.promotionOwnerRequest.dismiss.error.title'));
		// Reload the list: another recipient can have closed the request.
		onItemChange({ type: 'promotion_owner_request', id });
	} finally {
		dismissing.value = false;
		pendingDismiss.value = null;
	}
}
</script>

<template>
	<section :class="$style.detail" data-test-id="inbox-owner-request-detail">
		<header :class="$style.header">
			<div :class="$style.titleRow">
				<!-- Inline, so the state tag follows the last word of a title that wraps. -->
				<div :class="$style.title">
					<N8nHeading tag="h2" size="xlarge" bold :class="$style.titleText">
						{{
							i18n.baseText(`inbox.promotionOwnerRequest.title.${item.operation}`, {
								interpolate: { name: item.resource.name },
							})
						}}
					</N8nHeading>
					<N8nBadge
						:variant="outcomeBadge[outcome]"
						size="xxsmall"
						:class="$style.stateBadge"
						data-test-id="inbox-owner-request-state"
					>
						{{ i18n.baseText(`inbox.promotionOwnerRequest.outcome.${outcome}`) }}
					</N8nBadge>
				</div>
				<div v-if="item.state === 'open'" :class="$style.actions">
					<N8nButton
						variant="outline"
						size="small"
						:loading="dismissing"
						data-test-id="inbox-owner-request-dismiss"
						@click="pendingDismiss = { id: item.id }"
					>
						{{ i18n.baseText('inbox.promotionOwnerRequest.dismiss.button') }}
					</N8nButton>
					<N8nButton
						v-if="item.ownerProject"
						size="small"
						:disabled="dismissing"
						data-test-id="inbox-owner-request-operate"
						@click="openOperation"
					>
						{{
							i18n.baseText(`inbox.promotionOwnerRequest.action.${item.operation}`, {
								interpolate: { name: item.resource.name },
							})
						}}
					</N8nButton>
				</div>
			</div>
			<div :class="$style.meta">
				<span :class="$style.metaItem">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionOwnerRequest.detail.requestedBy') }}
					</N8nText>
					<N8nAvatar
						:first-name="item.requester.firstName"
						:last-name="item.requester.lastName"
						size="xsmall"
					/>
					<N8nText size="small" data-test-id="inbox-owner-request-requester">
						{{ requesterName }}
					</N8nText>
				</span>
				<span :class="$style.metaItem">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionOwnerRequest.detail.operation') }}
					</N8nText>
					<N8nText size="small" bold data-test-id="inbox-owner-request-operation">
						{{ i18n.baseText(`inbox.promotionOwnerRequest.operation.${item.operation}`) }}
					</N8nText>
				</span>
				<span :class="$style.metaItem">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionOwnerRequest.detail.environment') }}
					</N8nText>
					<N8nText size="small" bold data-test-id="inbox-owner-request-environment">
						{{ item.environment.name }}
					</N8nText>
				</span>
			</div>
		</header>

		<div :class="$style.body">
			<N8nCallout
				v-if="item.state === 'closed'"
				:theme="outcome === 'promoted' || outcome === 'applied' ? 'success' : 'secondary'"
				data-test-id="inbox-owner-request-closed"
			>
				{{ closedMessage }}
			</N8nCallout>

			<div :class="$style.section">
				<N8nText size="small" color="text-light" bold>
					{{ i18n.baseText('inbox.promotionOwnerRequest.detail.resource') }}
				</N8nText>
				<div :class="$style.resource" data-test-id="inbox-owner-request-resource">
					<span :class="$style.resourceIcon">
						<N8nIcon :icon="ownerRequestIcon[item.resource.kind]" size="large" />
					</span>
					<div :class="$style.resourceText">
						<N8nText bold :class="$style.resourceName">{{ item.resource.name }}</N8nText>
						<N8nText size="small" color="text-light">
							{{ kindLabel }}
							<template v-if="item.resource.credentialType">
								· {{ item.resource.credentialType }}
							</template>
						</N8nText>
					</div>
					<span v-if="item.ownerProject" :class="$style.project">
						<N8nIcon icon="layers" size="small" color="text-light" />
						<N8nText size="small" :class="$style.projectName">
							{{ item.ownerProject.name }}
						</N8nText>
					</span>
				</div>
			</div>

			<div :class="$style.section">
				<N8nText size="small" color="text-light" bold>
					{{ i18n.baseText('inbox.promotionOwnerRequest.detail.whyTitle') }}
				</N8nText>
				<N8nText tag="p" :class="$style.paragraph" data-test-id="inbox-owner-request-why">
					{{ why }}
				</N8nText>
			</div>

			<template v-if="item.state === 'open'">
				<div v-if="item.ownerProject" :class="$style.section">
					<N8nText size="small" color="text-light" bold>
						{{ i18n.baseText('inbox.promotionOwnerRequest.detail.nextTitle') }}
					</N8nText>
					<N8nText tag="p" :class="$style.paragraph">
						{{
							i18n.baseText(`inbox.promotionOwnerRequest.detail.next.${item.operation}`, {
								interpolate,
							})
						}}
					</N8nText>
				</div>
				<N8nCallout v-else theme="info" data-test-id="inbox-owner-request-no-project">
					<div :class="$style.calloutText">
						<N8nText bold size="small">
							{{ i18n.baseText('inbox.promotionOwnerRequest.detail.noProject.title') }}
						</N8nText>
						<N8nText size="small">
							{{
								i18n.baseText(`inbox.promotionOwnerRequest.detail.noProject.body.${item.operation}`)
							}}
						</N8nText>
					</div>
					<template v-if="item.operation === 'apply'" #trailingContent>
						<N8nButton
							variant="outline"
							size="small"
							data-test-id="inbox-owner-request-instance-apply"
							@click="openInstanceApply"
						>
							{{ i18n.baseText('inbox.promotionOwnerRequest.detail.noProject.action') }}
						</N8nButton>
					</template>
				</N8nCallout>
			</template>
		</div>

		<N8nDialog
			:open="!!pendingDismiss"
			size="small"
			:show-close-button="false"
			:close-on-overlay-click="!dismissing"
			:close-on-escape="!dismissing"
			@update:open="closeDismiss"
		>
			<N8nDialogHeader>
				<N8nDialogTitle>
					{{ i18n.baseText('inbox.promotionOwnerRequest.dismiss.confirm.title') }}
				</N8nDialogTitle>
				<N8nDialogDescription>
					{{
						i18n.baseText('inbox.promotionOwnerRequest.dismiss.confirm.description', {
							interpolate,
						})
					}}
				</N8nDialogDescription>
			</N8nDialogHeader>
			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					:label="i18n.baseText('generic.cancel')"
					:disabled="dismissing"
					@click="closeDismiss"
				/>
				<N8nButton
					:label="i18n.baseText('inbox.promotionOwnerRequest.dismiss.button')"
					:loading="dismissing"
					data-test-id="inbox-owner-request-dismiss-confirm"
					@click="onDismiss"
				/>
			</N8nDialogFooter>
		</N8nDialog>
	</section>
</template>

<style module lang="scss">
.detail {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--md);
	min-height: 0;
	/* The right gutter of the other Inbox details. */
	margin-right: var(--spacing--md);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-bottom: var(--spacing--md);
	border-bottom: var(--border);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
	/* Matches the title row of the reviews, so the headings sit at the same height. */
	min-height: var(--spacing--xl);
}

.title {
	flex: 1;
	min-width: 0;
	/* The font of the heading, so the tag lines up with the title text. */
	font-size: var(--font-size--xl);
	line-height: var(--line-height--sm);
}

.titleText {
	display: inline;
}

.stateBadge {
	margin-left: var(--spacing--xs);
	vertical-align: middle;
}

.actions {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--xs);
}

.meta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs) var(--spacing--lg);
}

.metaItem {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.body {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--lg);
	min-height: 0;
	max-width: var(--review-activity--max-width);
	overflow: auto;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.paragraph {
	margin: 0;
	line-height: var(--line-height--xl);
}

.resource {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	min-width: 0;
}

.resourceIcon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
	color: var(--color--text);
}

.resourceText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.resourceName,
.projectName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.project {
	display: inline-flex;
	flex-shrink: 1;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	max-width: 40%;
}

.calloutText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
