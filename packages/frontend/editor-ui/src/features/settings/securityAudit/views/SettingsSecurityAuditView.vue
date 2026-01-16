<script lang="ts" setup>
import { onMounted, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nHeading,
	N8nButton,
	N8nText,
	N8nLoading,
	N8nCallout,
	N8nIcon,
} from '@n8n/design-system';
import { RISK_CATEGORIES, type RiskCategory } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useSecurityAuditStore } from '../securityAudit.store';
import SecurityAuditCategory from '../components/SecurityAuditCategory.vue';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const toast = useToast();
const securityAuditStore = useSecurityAuditStore();

const formattedLastRunAt = computed(() => {
	if (!securityAuditStore.lastRunAt) return null;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(securityAuditStore.lastRunAt);
});

const hasAnyIssues = computed(() => securityAuditStore.totalIssueCount > 0);

const getReportForCategory = (category: RiskCategory) => {
	return securityAuditStore.getReportByCategory(category);
};

const runAudit = async () => {
	try {
		await securityAuditStore.runAudit();
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.securityAudit.runSuccess.title'),
			message: i18n.baseText('settings.securityAudit.runSuccess.message'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.securityAudit.runError.title'));
	}
};

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.securityAudit'));
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.headerContent">
				<N8nHeading tag="h2" size="2xlarge">{{
					i18n.baseText('settings.securityAudit')
				}}</N8nHeading>
				<N8nText color="text-light" :class="$style.description">{{
					i18n.baseText('settings.securityAudit.description')
				}}</N8nText>
			</div>
			<N8nButton
				:loading="securityAuditStore.isLoading"
				size="large"
				data-test-id="run-security-audit-button"
				@click="runAudit"
			>
				<N8nIcon icon="lock" :class="$style.buttonIcon" />
				{{ i18n.baseText('settings.securityAudit.runButton') }}
			</N8nButton>
		</div>

		<div v-if="securityAuditStore.isLoading" :class="$style.loading">
			<N8nLoading :rows="5" />
			<N8nText color="text-light" :class="$style.loadingText">{{
				i18n.baseText('settings.securityAudit.loading')
			}}</N8nText>
		</div>

		<div v-else-if="securityAuditStore.error" :class="$style.errorState">
			<N8nCallout theme="danger">
				<template #icon>
					<N8nIcon icon="triangle-alert" size="large" />
				</template>
				<N8nText bold>{{ i18n.baseText('settings.securityAudit.error.title') }}</N8nText>
				<N8nText color="text-light" size="small">{{ securityAuditStore.error.message }}</N8nText>
			</N8nCallout>
		</div>

		<div v-else-if="!securityAuditStore.lastRunAt" :class="$style.emptyState">
			<N8nCallout theme="info">
				<template #icon>
					<N8nIcon icon="lock" size="large" />
				</template>
				<N8nText>{{ i18n.baseText('settings.securityAudit.emptyState.title') }}</N8nText>
				<N8nText color="text-light" size="small">{{
					i18n.baseText('settings.securityAudit.emptyState.description')
				}}</N8nText>
			</N8nCallout>
		</div>

		<div v-else :class="$style.results">
			<div :class="$style.summary">
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.securityAudit.lastRun') }}: {{ formattedLastRunAt }}
				</N8nText>
				<div v-if="securityAuditStore.isEmptyResult || !hasAnyIssues" :class="$style.allClear">
					<N8nIcon icon="circle-check" :class="$style.allClearIcon" />
					<N8nText>{{ i18n.baseText('settings.securityAudit.allClear') }}</N8nText>
				</div>
			</div>

			<div :class="$style.categories">
				<template v-for="category in RISK_CATEGORIES" :key="category">
					<SecurityAuditCategory
						v-if="getReportForCategory(category)"
						:report="getReportForCategory(category)!"
						:initially-expanded="(getReportForCategory(category)?.sections.length ?? 0) > 0"
					/>
					<div v-else :class="$style.emptyCategory">
						<div :class="$style.emptyCategoryHeader">
							<N8nIcon
								:icon="
									category === 'credentials'
										? 'key-round'
										: category === 'database'
											? 'database'
											: category === 'nodes'
												? 'git-branch'
												: category === 'instance'
													? 'server'
													: 'folder-open'
								"
								:class="$style.emptyCategoryIcon"
							/>
							<N8nText bold>{{
								i18n.baseText(`settings.securityAudit.categories.${category}`)
							}}</N8nText>
							<div :class="$style.emptyCategoryStatus">
								<N8nIcon icon="circle-check" :class="$style.successIcon" />
							</div>
						</div>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	max-width: 800px;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: var(--spacing--xl);
	gap: var(--spacing--md);
}

.headerContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.description {
	max-width: 500px;
}

.buttonIcon {
	margin-right: var(--spacing--2xs);
}

.loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing--2xl);
}

.loadingText {
	margin-top: var(--spacing--md);
}

.emptyState {
	margin-top: var(--spacing--lg);
}

.errorState {
	margin-top: var(--spacing--lg);
}

.results {
	margin-top: var(--spacing--lg);
}

.summary {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--md);
	padding-bottom: var(--spacing--sm);
	border-bottom: 1px solid var(--color--foreground);
}

.allClear {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--success);
}

.allClearIcon {
	color: var(--color--success);
}

.categories {
	display: flex;
	flex-direction: column;
}

.emptyCategory {
	background-color: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	margin-bottom: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
}

.emptyCategoryHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.emptyCategoryIcon {
	color: var(--color--text--tint-1);
}

.emptyCategoryStatus {
	margin-left: auto;
}

.successIcon {
	color: var(--color--success);
}
</style>
