<script lang="ts" setup>
import { computed, ref, reactive } from 'vue';
import { N8nIcon, N8nText, N8nBadge, N8nLink, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	AuditReport,
	RiskCategory,
	StandardSection,
	InstanceSection,
	AdvisorySection,
	AdvisoryDetails,
	NodeLocation,
	CredentialLocation,
	CommunityNodeDetails,
	CustomNodeDetails,
} from '../securityAudit.api';

const MAX_VISIBLE_ITEMS = 50;

const props = defineProps<{
	report: AuditReport;
	initiallyExpanded?: boolean;
}>();

const i18n = useI18n();
const expanded = ref(props.initiallyExpanded ?? false);
const expandedSections = reactive<Record<number, boolean>>({});

const toggle = () => {
	expanded.value = !expanded.value;
};

const categoryIcon = computed(() => {
	const icons: Record<
		RiskCategory,
		'key-round' | 'database' | 'git-branch' | 'server' | 'folder-open' | 'shield-alert'
	> = {
		credentials: 'key-round',
		database: 'database',
		nodes: 'git-branch',
		instance: 'server',
		filesystem: 'folder-open',
		advisories: 'shield-alert',
	};
	return icons[props.report.risk];
});

const categoryLabel = computed(() => {
	return i18n.baseText(`settings.securityAudit.categories.${props.report.risk}`);
});

const issueCount = computed(() => props.report.sections.length);

const statusColor = computed<'success' | 'warning' | 'danger'>(() => {
	if (issueCount.value === 0) return 'success';
	if (issueCount.value <= 2) return 'warning';
	return 'danger';
});

const statusIcon = computed<'circle-check' | 'triangle-alert'>(() => {
	if (issueCount.value === 0) return 'circle-check';
	return 'triangle-alert';
});

const isNodeLocation = (
	location: NodeLocation | CredentialLocation | CommunityNodeDetails | CustomNodeDetails,
): location is NodeLocation => {
	return location.kind === 'node';
};

const isCredentialLocation = (
	location: NodeLocation | CredentialLocation | CommunityNodeDetails | CustomNodeDetails,
): location is CredentialLocation => {
	return location.kind === 'credential';
};

const isCommunityNodeDetails = (
	location: NodeLocation | CredentialLocation | CommunityNodeDetails | CustomNodeDetails,
): location is CommunityNodeDetails => {
	return location.kind === 'community';
};

const isCustomNodeDetails = (
	location: NodeLocation | CredentialLocation | CommunityNodeDetails | CustomNodeDetails,
): location is CustomNodeDetails => {
	return location.kind === 'custom';
};

const getWorkflowUrl = (workflowId: string) => {
	return `/workflow/${workflowId}`;
};

const getCredentialUrl = (credentialId: string) => {
	return `/home/credentials/${credentialId}`;
};

const isStandardSection = (
	section: StandardSection | InstanceSection,
): section is StandardSection => {
	return 'location' in section && Array.isArray(section.location);
};

const hasSettings = (section: StandardSection | InstanceSection): section is InstanceSection => {
	return 'settings' in section && section.settings !== undefined;
};

const isAdvisorySection = (
	section: StandardSection | InstanceSection | AdvisorySection,
): section is AdvisorySection => {
	return 'advisories' in section && Array.isArray(section.advisories);
};

const getSeverityClass = (severity: AdvisoryDetails['severity']): string => {
	const severityClasses: Record<AdvisoryDetails['severity'], string> = {
		critical: 'danger',
		high: 'danger',
		medium: 'warning',
		low: 'info',
	};
	return severityClasses[severity];
};

const formatDate = (dateString: string): string => {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
	}).format(new Date(dateString));
};

const formatSettingValue = (value: unknown): string => {
	if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
	if (value === 'none') return 'None';
	return String(value);
};

const formatSettingKey = (key: string): string => {
	// Convert camelCase to Title Case with spaces
	return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
};

const isSectionExpanded = (sectionIndex: number): boolean => {
	return expandedSections[sectionIndex] ?? false;
};

const toggleSectionExpand = (sectionIndex: number) => {
	expandedSections[sectionIndex] = !expandedSections[sectionIndex];
};

const getVisibleLocations = (section: StandardSection, sectionIndex: number) => {
	if (isSectionExpanded(sectionIndex) || section.location.length <= MAX_VISIBLE_ITEMS) {
		return section.location;
	}
	return section.location.slice(0, MAX_VISIBLE_ITEMS);
};

const getRemainingCount = (section: StandardSection, sectionIndex: number): number => {
	if (isSectionExpanded(sectionIndex)) return 0;
	return Math.max(0, section.location.length - MAX_VISIBLE_ITEMS);
};
</script>

<template>
	<div
		:class="[$style.category, { [$style.expanded]: expanded }]"
		:data-test-id="`security-audit-category-${report.risk}`"
	>
		<div :class="$style.header" @click="toggle" data-test-id="security-audit-category-header">
			<div :class="$style.headerLeft">
				<N8nIcon :icon="categoryIcon" :class="$style.categoryIcon" size="medium" />
				<N8nText :class="$style.categoryTitle" bold size="medium">{{ categoryLabel }}</N8nText>
				<N8nBadge v-if="issueCount > 0" :class="$style.badge">
					{{ i18n.baseText('settings.securityAudit.issueCount', { adjustToNumber: issueCount }) }}
				</N8nBadge>
			</div>
			<div :class="$style.headerRight">
				<N8nIcon :icon="statusIcon" :class="[$style.statusIcon, $style[statusColor]]" />
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" :class="$style.chevron" />
			</div>
		</div>

		<div v-if="expanded" :class="$style.content">
			<div v-if="issueCount === 0" :class="$style.noIssues">
				<N8nText color="text-light">{{
					i18n.baseText('settings.securityAudit.noIssuesInCategory')
				}}</N8nText>
			</div>

			<div
				v-for="(section, sectionIndex) in report.sections"
				:key="sectionIndex"
				:class="$style.section"
			>
				<div :class="$style.sectionHeader">
					<N8nText :class="$style.sectionTitle" bold>{{ section.title }}</N8nText>
				</div>
				<N8nText :class="$style.sectionDescription" color="text-light" size="small">{{
					section.description
				}}</N8nText>

				<div
					v-if="isStandardSection(section) && section.location.length > 0"
					:class="$style.locations"
				>
					<N8nText
						v-if="section.location.length > MAX_VISIBLE_ITEMS"
						color="text-light"
						size="small"
						:class="$style.locationCount"
					>
						{{ section.location.length }} items
					</N8nText>
					<div
						v-for="(location, locationIndex) in getVisibleLocations(section, sectionIndex)"
						:key="locationIndex"
						:class="$style.locationItem"
					>
						<template v-if="isNodeLocation(location)">
							<N8nIcon icon="waypoints" size="small" :class="$style.locationIcon" />
							<N8nLink
								:href="getWorkflowUrl(location.workflowId)"
								target="_blank"
								:class="$style.locationLink"
							>
								{{ location.workflowName }}
							</N8nLink>
							<N8nText color="text-light" size="small"> / {{ location.nodeName }}</N8nText>
						</template>

						<template v-else-if="isCredentialLocation(location)">
							<N8nIcon icon="key-round" size="small" :class="$style.locationIcon" />
							<N8nLink
								:href="getCredentialUrl(location.id)"
								target="_blank"
								:class="$style.locationLink"
							>
								{{ location.name }}
							</N8nLink>
						</template>

						<template v-else-if="isCommunityNodeDetails(location)">
							<N8nIcon icon="box" size="small" :class="$style.locationIcon" />
							<N8nLink :href="location.packageUrl" target="_blank" :class="$style.locationLink">
								{{ location.nodeType }}
							</N8nLink>
						</template>

						<template v-else-if="isCustomNodeDetails(location)">
							<N8nIcon icon="code" size="small" :class="$style.locationIcon" />
							<N8nText size="small">{{ location.nodeType }}</N8nText>
							<N8nText color="text-light" size="small"> ({{ location.filePath }})</N8nText>
						</template>
					</div>
					<N8nButton
						v-if="getRemainingCount(section, sectionIndex) > 0"
						type="tertiary"
						size="small"
						:class="$style.showMoreButton"
						@click="toggleSectionExpand(sectionIndex)"
					>
						{{
							i18n.baseText('settings.securityAudit.showMore', {
								interpolate: { count: getRemainingCount(section, sectionIndex) },
							})
						}}
					</N8nButton>
					<N8nButton
						v-else-if="
							section.location.length > MAX_VISIBLE_ITEMS && isSectionExpanded(sectionIndex)
						"
						type="tertiary"
						size="small"
						:class="$style.showMoreButton"
						@click="toggleSectionExpand(sectionIndex)"
					>
						{{ i18n.baseText('settings.securityAudit.showLess') }}
					</N8nButton>
				</div>

				<div
					v-if="isAdvisorySection(section) && section.advisories.length > 0"
					:class="$style.advisories"
				>
					<div
						v-for="(advisory, advisoryIndex) in section.advisories"
						:key="advisoryIndex"
						:class="$style.advisoryItem"
					>
						<div :class="$style.advisoryHeader">
							<N8nBadge
								:class="[
									$style.severityBadge,
									$style[`severity-${getSeverityClass(advisory.severity)}`],
								]"
							>
								{{
									i18n.baseText(`settings.securityAudit.advisories.severity.${advisory.severity}`)
								}}
							</N8nBadge>
							<N8nLink :href="advisory.htmlUrl" target="_blank" :class="$style.advisoryId">
								{{ advisory.ghsaId }}
							</N8nLink>
							<N8nText v-if="advisory.cveId" color="text-light" size="small">
								({{ advisory.cveId }})
							</N8nText>
						</div>
						<N8nText :class="$style.advisorySummary" size="small">{{ advisory.summary }}</N8nText>
						<div :class="$style.advisoryMeta">
							<div :class="$style.advisoryMetaItem">
								<N8nText color="text-light" size="small">
									{{ i18n.baseText('settings.securityAudit.advisories.vulnerableRange') }}:
								</N8nText>
								<N8nText size="small" :class="$style.advisoryVersion">
									{{ advisory.vulnerableVersionRange }}
								</N8nText>
							</div>
							<div v-if="advisory.patchedVersions" :class="$style.advisoryMetaItem">
								<N8nText color="text-light" size="small">
									{{ i18n.baseText('settings.securityAudit.advisories.patchedIn') }}:
								</N8nText>
								<N8nText size="small" :class="$style.advisoryVersion">
									{{ advisory.patchedVersions }}
								</N8nText>
							</div>
							<div :class="$style.advisoryMetaItem">
								<N8nText color="text-light" size="small">
									{{ i18n.baseText('settings.securityAudit.advisories.publishedAt') }}:
								</N8nText>
								<N8nText size="small">{{ formatDate(advisory.publishedAt) }}</N8nText>
							</div>
						</div>
					</div>
				</div>

				<div v-if="hasSettings(section)" :class="$style.settings">
					<div
						v-for="(categorySettings, categoryName) in section.settings"
						:key="categoryName"
						:class="$style.settingsCategory"
					>
						<N8nText :class="$style.settingsCategoryTitle" bold size="small">{{
							formatSettingKey(String(categoryName))
						}}</N8nText>
						<div :class="$style.settingsList">
							<div
								v-for="(value, key) in categorySettings as Record<string, unknown>"
								:key="key"
								:class="$style.settingItem"
							>
								<N8nText size="small" color="text-light"
									>{{ formatSettingKey(String(key)) }}:</N8nText
								>
								<N8nText size="small">{{ formatSettingValue(value) }}</N8nText>
							</div>
						</div>
					</div>
				</div>

				<div v-if="section.recommendation" :class="$style.recommendation">
					<N8nIcon icon="lightbulb" size="small" :class="$style.recommendationIcon" />
					<N8nText size="small" color="text-light">{{ section.recommendation }}</N8nText>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.category {
	background-color: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	margin-bottom: var(--spacing--sm);
	overflow: hidden;
}

.expanded {
	background-color: var(--color--background);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm) var(--spacing--md);
	cursor: pointer;
	transition: background-color 0.2s ease;

	&:hover {
		background-color: var(--color--background--shade-1);
	}
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.headerRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.categoryIcon {
	color: var(--color--text--tint-1);
}

.categoryTitle {
	color: var(--color--text);
}

.badge {
	background-color: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}

.statusIcon {
	&.success {
		color: var(--color--success);
	}

	&.warning {
		color: var(--color--warning);
	}

	&.danger {
		color: var(--color--danger);
	}
}

.chevron {
	color: var(--color--text--tint-2);
}

.content {
	padding: 0 var(--spacing--md) var(--spacing--md);
	border-top: 1px solid var(--color--foreground);
}

.noIssues {
	padding: var(--spacing--sm) 0;
	text-align: center;
}

.section {
	padding: var(--spacing--sm) 0;
	border-bottom: 1px solid var(--color--foreground--tint-1);

	&:last-child {
		border-bottom: none;
	}
}

.sectionHeader {
	margin-bottom: var(--spacing--3xs);
}

.sectionTitle {
	color: var(--color--text);
}

.sectionDescription {
	margin-bottom: var(--spacing--xs);
}

.locations {
	background-color: var(--color--background--light-3);
	border-radius: var(--radius);
	padding: var(--spacing--xs);
	margin-bottom: var(--spacing--xs);
}

.locationItem {
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs) 0;
	gap: var(--spacing--3xs);
}

.locationIcon {
	color: var(--color--text--tint-2);
}

.locationLink {
	font-size: var(--font-size--sm);
}

.recommendation {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	background-color: var(--color--background--light-2);
	border-radius: var(--radius);
	margin-top: var(--spacing--xs);
}

.recommendationIcon {
	color: var(--color--warning);
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
}

.settings {
	background-color: var(--color--background--light-3);
	border-radius: var(--radius);
	padding: var(--spacing--xs);
	margin-bottom: var(--spacing--xs);
}

.settingsCategory {
	margin-bottom: var(--spacing--xs);

	&:last-child {
		margin-bottom: 0;
	}
}

.settingsCategoryTitle {
	color: var(--color--text);
	text-transform: capitalize;
	margin-bottom: var(--spacing--3xs);
	display: block;
}

.settingsList {
	padding-left: var(--spacing--sm);
}

.settingItem {
	display: flex;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
}

.locationCount {
	margin-bottom: var(--spacing--2xs);
	display: block;
}

.showMoreButton {
	margin-top: var(--spacing--xs);
	width: 100%;
}

.advisories {
	background-color: var(--color--background--light-3);
	border-radius: var(--radius);
	padding: var(--spacing--xs);
	margin-bottom: var(--spacing--xs);
}

.advisoryItem {
	padding: var(--spacing--xs) 0;
	border-bottom: 1px solid var(--color--foreground--tint-1);

	&:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	&:first-child {
		padding-top: 0;
	}
}

.advisoryHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--3xs);
}

.severityBadge {
	text-transform: uppercase;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
}

.severity-danger {
	background-color: var(--color--danger--tint-3);
	color: var(--color--danger--shade-1);
}

.severity-warning {
	background-color: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}

.severity-info {
	background-color: var(--color--primary--tint-3);
	color: var(--color--primary--shade-1);
}

.advisoryId {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--sm);
}

.advisorySummary {
	display: block;
	margin-bottom: var(--spacing--2xs);
	color: var(--color--text);
}

.advisoryMeta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
}

.advisoryMetaItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.advisoryVersion {
	font-family: monospace;
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: var(--radius--sm);
}
</style>
