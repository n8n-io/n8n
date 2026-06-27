<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from '@n8n/i18n';
import {
	N8nBadge,
	N8nButton,
	N8nDataTableServer,
	N8nHeading,
	N8nLink,
	N8nText,
	type BadgeTheme,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';

import Banner from '@/app/components/Banner.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useInstancePullStore } from '../instance-pull.store';
import type { MissingCredential, ReviewSummary } from '../types';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { showError } = useToast();

const store = useInstancePullStore();
const { reviews, loading, isPrd, blockedCount } = storeToRefs(store);

const refreshing = ref(false);

const titleKey = computed(() =>
	isPrd.value ? 'instancePull.requests.title' : 'instancePull.myReviews.title',
);

const subtitleKey = computed(() =>
	isPrd.value ? 'instancePull.requests.subtitle' : 'instancePull.myReviews.subtitle',
);

const emptyKey = computed(() =>
	isPrd.value ? 'instancePull.requests.empty' : 'instancePull.myReviews.empty',
);

const statusTheme: Record<ReviewSummary['status'], BadgeTheme> = {
	pending: 'default',
	blocked: 'danger',
	ready: 'success',
	published: 'primary',
};

const statusLabel = (status: ReviewSummary['status']): string =>
	i18n.baseText(`instancePull.status.${status}`);

const headers = computed<Array<TableHeader<ReviewSummary>>>(() => {
	const base: Array<TableHeader<ReviewSummary>> = [
		{
			title: i18n.baseText('instancePull.column.workflow'),
			key: 'workflowName',
			value: (row) => row.workflowName,
			minWidth: 220,
		},
		{
			title: i18n.baseText('instancePull.column.status'),
			key: 'status',
			value: (row) => row.status,
			minWidth: 120,
		},
		{
			title: i18n.baseText('instancePull.column.pullRequest'),
			key: 'pullRequestNumber',
			value: (row) => row.pullRequestNumber,
			minWidth: 120,
		},
	];

	if (isPrd.value) {
		base.push({
			title: i18n.baseText('instancePull.column.action'),
			key: 'action',
			value: () => '',
			minWidth: 260,
			disableSort: true,
		});
	}

	return base;
});

// Deep-links to the prefilled create-credential form. The credentials view
// reads these query params and prefills the form (owned by the FE-actions slice).
const credentialFormRoute = (credential: MissingCredential) => ({
	name: VIEWS.CREDENTIALS,
	query: {
		credentialType: credential.type,
		credentialName: credential.name,
		credentialId: credential.id,
	},
});

const onCreateCredential = (credential: MissingCredential) => {
	void router.push(credentialFormRoute(credential));
};

const refresh = async () => {
	refreshing.value = true;
	try {
		await store.fetchReviews();
	} catch (error) {
		showError(error, i18n.baseText('instancePull.loadError'));
	} finally {
		refreshing.value = false;
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText(titleKey.value));
	await refresh();
});
</script>

<template>
	<div :class="$style.page" data-test-id="instance-pull-view">
		<header :class="$style.header">
			<div :class="$style.headingRow">
				<N8nHeading tag="h1" size="2xlarge" bold>
					{{ i18n.baseText(titleKey) }}
				</N8nHeading>
				<N8nButton
					variant="outline"
					size="medium"
					icon="refresh-cw"
					:loading="refreshing"
					data-test-id="instance-pull-refresh"
					@click="refresh"
				>
					{{ i18n.baseText('instancePull.refresh') }}
				</N8nButton>
			</div>
			<N8nText color="text-base">{{ i18n.baseText(subtitleKey) }}</N8nText>
		</header>

		<Banner
			v-if="isPrd && blockedCount > 0"
			theme="warning"
			:message="
				i18n.baseText('instancePull.banner.blocked', { interpolate: { count: blockedCount } })
			"
			data-test-id="instance-pull-attention-banner"
		/>

		<div :class="$style.tableWrapper">
			<N8nDataTableServer
				:headers="headers"
				:items="reviews"
				:items-length="reviews.length"
				:loading="loading"
				data-test-id="instance-pull-table"
			>
				<template #[`item.status`]="{ item }">
					<N8nBadge :theme="statusTheme[item.status]" data-test-id="instance-pull-status-badge">
						{{ statusLabel(item.status) }}
					</N8nBadge>
				</template>

				<template #[`item.pullRequestNumber`]="{ item }">
					<N8nLink :to="item.pullRequestUrl" new-window theme="text" underline>
						#{{ item.pullRequestNumber }}
					</N8nLink>
				</template>

				<template v-if="isPrd" #[`item.action`]="{ item }">
					<div
						v-if="item.status === 'blocked' && item.missingCredentials?.length"
						:class="$style.actionCell"
					>
						<N8nButton
							v-for="credential in item.missingCredentials"
							:key="credential.id"
							variant="solid"
							size="small"
							icon="circle-plus"
							data-test-id="instance-pull-create-credential"
							@click="onCreateCredential(credential)"
						>
							{{
								i18n.baseText('instancePull.createCredential', {
									interpolate: { name: credential.name },
								})
							}}
						</N8nButton>
					</div>
					<N8nText v-else color="text-light">—</N8nText>
				</template>
			</N8nDataTableServer>

			<div
				v-if="!loading && reviews.length === 0"
				:class="$style.emptyState"
				data-test-id="instance-pull-empty"
			>
				<N8nHeading tag="h2" size="large">
					{{ i18n.baseText('instancePull.empty.title') }}
				</N8nHeading>
				<N8nText color="text-base">{{ i18n.baseText(emptyKey) }}</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding-bottom: var(--spacing--2xl);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.headingRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.tableWrapper {
	position: relative;
}

.actionCell {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xl) var(--spacing--md);
	text-align: center;
}
</style>
