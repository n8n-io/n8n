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
import { RISK_CATEGORIES, type RiskCategory, type AuditReport } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { usePostHog } from '@/app/stores/posthog.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { SECURITY_ADVISORIES_EXPERIMENT } from '@/app/constants/experiments';
import { useSecurityAuditStore } from '../securityCenter.store';
import SecurityAuditCategory from '../components/SecurityAuditCategory.vue';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const toast = useToast();
const posthog = usePostHog();
const rootStore = useRootStore();
const securityAuditStore = useSecurityAuditStore();

const isAdvisoriesEnabled = computed(() =>
	posthog.isFeatureEnabled(SECURITY_ADVISORIES_EXPERIMENT.name),
);

// Separate categories into Configuration Review vs Security Advisories
const configurationCategories = computed<RiskCategory[]>(() =>
	RISK_CATEGORIES.filter((cat) => cat !== 'advisories'),
);

const advisoriesCategory = computed<RiskCategory | null>(() =>
	isAdvisoriesEnabled.value ? 'advisories' : null,
);

const formattedLastRunAt = computed(() => {
	if (!securityAuditStore.lastRunAt) return null;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(securityAuditStore.lastRunAt);
});

// Count only actionable items from configuration categories (not advisories history)
const configurationIssueCount = computed(() => {
	return configurationCategories.value.reduce((count, category) => {
		const report = securityAuditStore.getReportByCategory(category);
		return count + (report?.sections.length ?? 0);
	}, 0);
});

// Count unpatched advisories only (affecting current version)
const unpatchedAdvisoriesCount = computed(() => {
	const advisoriesReport = securityAuditStore.getReportByCategory('advisories');
	if (!advisoriesReport) return 0;
	// Count sections that affect current version
	return advisoriesReport.sections.filter(
		(section) => 'affectsCurrentVersion' in section && section.affectsCurrentVersion,
	).length;
});

const actionableIssueCount = computed(
	() => configurationIssueCount.value + unpatchedAdvisoriesCount.value,
);
const currentVersion = computed(() => rootStore.versionCli);

const isSecure = computed(
	() => securityAuditStore.isEmptyResult || actionableIssueCount.value === 0,
);

const reportsByCategory = computed(() => {
	const map = new Map<RiskCategory, AuditReport>();
	for (const report of securityAuditStore.reports) {
		map.set(report.risk, report);
	}
	return map;
});

const getReportForCategory = (category: RiskCategory) => reportsByCategory.value.get(category);

const runAudit = async () => {
	try {
		await securityAuditStore.runAudit();
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.securityCenter.runSuccess.title'),
			message: i18n.baseText('settings.securityCenter.runSuccess.message'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.securityCenter.runError.title'));
	}
};

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.securityCenter'));
});
</script>

<template>
	<div :class="$style.container" data-test-id="settings-security-center">
		<div :class="$style.header">
			<div :class="$style.headerContent">
				<N8nHeading tag="h2" size="2xlarge">{{
					i18n.baseText('settings.securityCenter')
				}}</N8nHeading>
				<N8nText color="text-light" :class="$style.description">{{
					i18n.baseText('settings.securityCenter.description')
				}}</N8nText>
			</div>
			<N8nButton
				:loading="securityAuditStore.isLoading"
				:disabled="securityAuditStore.isLoading"
				size="large"
				data-test-id="run-security-check-button"
				@click="runAudit"
			>
				<N8nIcon icon="lock" :class="$style.buttonIcon" />
				{{ i18n.baseText('settings.securityCenter.runButton') }}
			</N8nButton>
		</div>

		<div
			v-if="securityAuditStore.isLoading"
			:class="$style.loading"
			data-test-id="security-center-loading"
		>
			<N8nLoading :rows="5" />
			<N8nText color="text-light" :class="$style.loadingText">{{
				i18n.baseText('settings.securityCenter.loading')
			}}</N8nText>
		</div>

		<div
			v-else-if="securityAuditStore.error"
			:class="$style.errorState"
			data-test-id="security-center-error"
		>
			<N8nCallout theme="danger">
				<template #icon>
					<N8nIcon icon="triangle-alert" size="large" />
				</template>
				<N8nText bold>{{ i18n.baseText('settings.securityCenter.error.title') }}</N8nText>
				<br />
				<N8nText color="text-light" size="small">{{ securityAuditStore.error.message }}</N8nText>
			</N8nCallout>
		</div>

		<div v-else-if="!securityAuditStore.lastRunAt" :class="$style.emptyState">
			<N8nCallout theme="info">
				<template #icon>
					<N8nIcon icon="lock" size="large" />
				</template>
				<N8nText>{{ i18n.baseText('settings.securityCenter.emptyState.title') }}</N8nText>
				<br />
				<N8nText color="text-light" size="small">{{
					i18n.baseText('settings.securityCenter.emptyState.description')
				}}</N8nText>
			</N8nCallout>
		</div>

		<div v-else :class="$style.results" data-test-id="security-center-results" aria-live="polite">
			<!-- Status Overview Section -->
			<div
				:class="[$style.statusOverview, isSecure ? $style.statusSecure : $style.statusWarning]"
				data-test-id="security-center-status"
				role="status"
			>
				<div :class="$style.statusMain">
					<div :class="$style.statusIcon">
						<N8nIcon :icon="isSecure ? 'circle-check' : 'shield-alert'" size="xlarge" />
					</div>
					<div :class="$style.statusContent">
						<N8nHeading tag="h3" size="large" :class="$style.statusTitle">
							{{
								isSecure
									? i18n.baseText('settings.securityCenter.status.secure')
									: i18n.baseText('settings.securityCenter.status.actionNeeded')
							}}
						</N8nHeading>
						<N8nText color="text-light" size="small">
							<template v-if="isSecure">
								{{
									i18n.baseText('settings.securityCenter.status.secureDescription', {
										interpolate: { version: currentVersion },
									})
								}}
							</template>
							<template v-else>
								{{
									i18n.baseText('settings.securityCenter.status.actionNeededDescription', {
										adjustToNumber: actionableIssueCount,
									})
								}}
							</template>
						</N8nText>
					</div>
				</div>
				<div :class="$style.statusMeta">
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('settings.securityCenter.lastRun') }}: {{ formattedLastRunAt }}
					</N8nText>
				</div>
			</div>

			<!-- Configuration Review Section -->
			<div :class="$style.section" data-test-id="security-center-config-review">
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h3" size="medium">{{
						i18n.baseText('settings.securityCenter.sections.configurationReview')
					}}</N8nHeading>
					<N8nText color="text-light" size="small">{{
						i18n.baseText('settings.securityCenter.sections.configurationReviewDescription')
					}}</N8nText>
				</div>
				<div :class="$style.categories">
					<template v-for="category in configurationCategories" :key="category">
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
									i18n.baseText(`settings.securityCenter.categories.${category}`)
								}}</N8nText>
								<div :class="$style.emptyCategoryStatus">
									<N8nIcon icon="circle-check" :class="$style.successIcon" />
								</div>
							</div>
						</div>
					</template>
				</div>
			</div>

			<!-- Security Advisories Section -->
			<div
				v-if="advisoriesCategory"
				:class="$style.section"
				data-test-id="security-center-advisories"
			>
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h3" size="medium">{{
						i18n.baseText('settings.securityCenter.sections.securityAdvisories')
					}}</N8nHeading>
					<N8nText color="text-light" size="small">{{
						i18n.baseText('settings.securityCenter.sections.securityAdvisoriesDescription')
					}}</N8nText>
				</div>
				<div :class="$style.categories">
					<SecurityAuditCategory
						v-if="getReportForCategory('advisories')"
						:report="getReportForCategory('advisories')!"
						:initially-expanded="unpatchedAdvisoriesCount > 0"
					/>
					<div v-else :class="$style.emptyCategory">
						<div :class="$style.emptyCategoryHeader">
							<N8nIcon icon="circle-check" :class="$style.emptyCategoryIcon" />
							<N8nText bold>{{
								i18n.baseText('settings.securityCenter.advisories.allPatched')
							}}</N8nText>
							<div :class="$style.emptyCategoryStatus">
								<N8nIcon icon="circle-check" :class="$style.successIcon" />
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Resources Section -->
			<div :class="$style.section" data-test-id="security-center-resources">
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h3" size="medium">{{
						i18n.baseText('settings.securityCenter.sections.resources')
					}}</N8nHeading>
					<N8nText color="text-light" size="small">{{
						i18n.baseText('settings.securityCenter.sections.resourcesDescription')
					}}</N8nText>
				</div>
				<div :class="$style.resourcesGrid">
					<a
						href="https://trust.n8n.io"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.resourceCard"
						data-test-id="security-center-resource-trust-center"
					>
						<N8nIcon icon="badge-check" :class="$style.resourceIcon" />
						<div :class="$style.resourceContent">
							<N8nText bold>{{
								i18n.baseText('settings.securityCenter.resources.trustCenter.title')
							}}</N8nText>
							<N8nText color="text-light" size="small">{{
								i18n.baseText('settings.securityCenter.resources.trustCenter.description')
							}}</N8nText>
						</div>
						<N8nIcon icon="external-link" :class="$style.resourceArrow" />
					</a>
					<a
						href="https://docs.n8n.io/hosting/security/"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.resourceCard"
						data-test-id="security-center-resource-documentation"
					>
						<N8nIcon icon="book-open" :class="$style.resourceIcon" />
						<div :class="$style.resourceContent">
							<N8nText bold>{{
								i18n.baseText('settings.securityCenter.resources.documentation.title')
							}}</N8nText>
							<N8nText color="text-light" size="small">{{
								i18n.baseText('settings.securityCenter.resources.documentation.description')
							}}</N8nText>
						</div>
						<N8nIcon icon="external-link" :class="$style.resourceArrow" />
					</a>
					<a
						href="https://n8n.io/security/"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.resourceCard"
						data-test-id="security-center-resource-report-vulnerability"
					>
						<N8nIcon icon="shield-alert" :class="$style.resourceIcon" />
						<div :class="$style.resourceContent">
							<N8nText bold>{{
								i18n.baseText('settings.securityCenter.resources.reportVulnerability.title')
							}}</N8nText>
							<N8nText color="text-light" size="small">{{
								i18n.baseText('settings.securityCenter.resources.reportVulnerability.description')
							}}</N8nText>
						</div>
						<N8nIcon icon="external-link" :class="$style.resourceArrow" />
					</a>
				</div>
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

/* Status Overview Styles */
.statusOverview {
	border-radius: var(--radius--lg);
	padding: var(--spacing--lg);
	margin-bottom: var(--spacing--xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.statusSecure {
	background-color: var(--color--success--tint-4);
	border: 1px solid var(--color--success--tint-1);

	.statusIcon {
		color: var(--color--success);
	}

	.statusTitle {
		color: var(--color--success--shade-1);
	}
}

.statusWarning {
	background-color: var(--color--warning--tint-2);
	border: 1px solid var(--color--warning--tint-1);

	.statusIcon {
		color: var(--color--warning--shade-1);
	}

	.statusTitle {
		color: var(--color--warning--shade-1);
	}
}

.statusMain {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
}

.statusIcon {
	flex-shrink: 0;
}

.statusContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.statusTitle {
	margin: 0;
}

.statusMeta {
	border-top: 1px solid var(--color--foreground--tint-1);
	padding-top: var(--spacing--sm);
}

/* Section Styles */
.section {
	margin-bottom: var(--spacing--xl);
}

.sectionHeader {
	margin-bottom: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
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

/* Resources Section Styles */
.resourcesGrid {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.resourceCard {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--md);
	background-color: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	text-decoration: none;
	color: inherit;
	transition:
		background-color 0.2s ease,
		border-color 0.2s ease;

	&:hover {
		background-color: var(--color--background--shade-1);
		border-color: var(--color--primary--tint-1);
	}
}

.resourceIcon {
	color: var(--color--primary);
	flex-shrink: 0;
}

.resourceContent {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.resourceArrow {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}
</style>
