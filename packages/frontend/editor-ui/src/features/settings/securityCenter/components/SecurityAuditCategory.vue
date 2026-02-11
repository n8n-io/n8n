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
	NodeLocation,
	CredentialLocation,
	CommunityNodeDetails,
	CustomNodeDetails,
} from '../securityCenter.api';
import SecurityAdvisoryItem from './SecurityAdvisoryItem.vue';

const MAX_VISIBLE_ITEMS = 50;

const props = defineProps<{
	report: AuditReport;
	initiallyExpanded?: boolean;
}>();

const i18n = useI18n();
const expanded = ref(props.initiallyExpanded ?? false);
const expandedSections = reactive<Record<number, boolean>>({});
const historicalAdvisoriesExpanded = ref(false);

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
	return i18n.baseText(`settings.securityCenter.categories.${props.report.risk}`);
});

// Count only actionable items, not informational sections
const actionableIssueCount = computed(() => {
	// For advisories: only count sections affecting current version
	if (props.report.risk === 'advisories') {
		return props.report.sections.filter(
			(section) => 'affectsCurrentVersion' in section && section.affectsCurrentVersion,
		).length;
	}

	// For instance: only count sections with actual locations (not just settings info)
	if (props.report.risk === 'instance') {
		return props.report.sections.filter(
			(section) =>
				'location' in section && Array.isArray(section.location) && section.location.length > 0,
		).length;
	}

	// For other categories: count sections with locations
	return props.report.sections.filter(
		(section) =>
			'location' in section && Array.isArray(section.location) && section.location.length > 0,
	).length;
});

// Total sections (for display purposes)
const totalSectionCount = computed(() => props.report.sections.length);

// Calibrate visual severity based on category and actual risk
const statusColor = computed<'success' | 'warning' | 'danger' | 'info'>(() => {
	if (actionableIssueCount.value === 0) return 'success';

	// For advisories, check if any affect current version
	if (props.report.risk === 'advisories') {
		const hasUnpatchedCritical = props.report.sections.some(
			(section) =>
				'affectsCurrentVersion' in section &&
				section.affectsCurrentVersion &&
				'advisories' in section &&
				section.advisories.some((a) => a.severity === 'critical' || a.severity === 'high'),
		);
		if (hasUnpatchedCritical) return 'danger';

		const hasUnpatched = props.report.sections.some(
			(section) => 'affectsCurrentVersion' in section && section.affectsCurrentVersion,
		);
		if (hasUnpatched) return 'warning';

		// Historical/patched advisories are informational
		return 'info';
	}

	// Configuration categories are warnings (review needed, not critical)
	return 'warning';
});

const statusIcon = computed<'circle-check' | 'triangle-alert' | 'info'>(() => {
	if (actionableIssueCount.value === 0) return 'circle-check';
	if (statusColor.value === 'info') return 'info';
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

// For advisories: separate sections into affecting and historical
const affectingSections = computed(() => {
	if (props.report.risk !== 'advisories') return [];
	return props.report.sections.filter(
		(section) => 'affectsCurrentVersion' in section && section.affectsCurrentVersion,
	);
});

const historicalSections = computed(() => {
	if (props.report.risk !== 'advisories') return [];
	return props.report.sections.filter(
		(section) => 'affectsCurrentVersion' in section && !section.affectsCurrentVersion,
	);
});

const toggleHistoricalAdvisories = () => {
	historicalAdvisoriesExpanded.value = !historicalAdvisoriesExpanded.value;
};

const historicalAdvisoryCount = computed(() => {
	return historicalSections.value.reduce((count, section) => {
		if ('advisories' in section && Array.isArray(section.advisories)) {
			return count + section.advisories.length;
		}
		return count;
	}, 0);
});

const getSettingsEntries = (value: unknown): [string, unknown][] => {
	if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
		return Object.entries(value);
	}
	return [];
};
</script>

<template>
	<div
		:class="[$style.category, { [$style.expanded]: expanded }]"
		:data-test-id="`security-center-category-${report.risk}`"
	>
		<div
			:class="$style.header"
			role="button"
			tabindex="0"
			:aria-expanded="expanded"
			:aria-controls="`category-content-${report.risk}`"
			data-test-id="security-center-category-header"
			@click="toggle"
			@keydown.enter="toggle"
			@keydown.space.prevent="toggle"
		>
			<div :class="$style.headerLeft">
				<N8nIcon :icon="categoryIcon" :class="$style.categoryIcon" size="medium" />
				<N8nText :class="$style.categoryTitle" bold size="medium">{{ categoryLabel }}</N8nText>
				<N8nBadge v-if="actionableIssueCount > 0" :class="$style.badge">
					{{
						i18n.baseText('settings.securityCenter.issueCount', {
							adjustToNumber: actionableIssueCount,
						})
					}}
				</N8nBadge>
			</div>
			<div :class="$style.headerRight">
				<N8nIcon :icon="statusIcon" :class="[$style.statusIcon, $style[statusColor]]" />
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" :class="$style.chevron" />
			</div>
		</div>

		<div
			v-if="expanded"
			:id="`category-content-${report.risk}`"
			:class="$style.content"
			role="region"
			:aria-label="categoryLabel"
		>
			<div v-if="totalSectionCount === 0" :class="$style.noIssues">
				<N8nText color="text-light">{{
					i18n.baseText('settings.securityCenter.noIssuesInCategory')
				}}</N8nText>
			</div>

			<!-- For non-advisory categories, render all sections normally -->
			<template v-if="report.risk !== 'advisories'">
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
								<N8nLink :to="getWorkflowUrl(location.workflowId)" :class="$style.locationLink">
									{{ location.workflowName }}
								</N8nLink>
								<N8nText color="text-light" size="small"> / {{ location.nodeName }}</N8nText>
							</template>

							<template v-else-if="isCredentialLocation(location)">
								<N8nIcon icon="key-round" size="small" :class="$style.locationIcon" />
								<N8nLink :to="getCredentialUrl(location.id)" :class="$style.locationLink">
									{{ location.name }}
								</N8nLink>
							</template>

							<template v-else-if="isCommunityNodeDetails(location)">
								<N8nIcon icon="box" size="small" :class="$style.locationIcon" />
								<N8nLink
									:to="location.packageUrl"
									:new-window="true"
									rel="noopener noreferrer"
									:class="$style.locationLink"
								>
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
							data-test-id="show-more-button"
							@click="toggleSectionExpand(sectionIndex)"
						>
							{{
								i18n.baseText('settings.securityCenter.showMore', {
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
							data-test-id="show-less-button"
							@click="toggleSectionExpand(sectionIndex)"
						>
							{{ i18n.baseText('settings.securityCenter.showLess') }}
						</N8nButton>
					</div>

					<div
						v-if="isAdvisorySection(section) && section.advisories.length > 0"
						:class="$style.advisories"
					>
						<SecurityAdvisoryItem
							v-for="(advisory, advisoryIndex) in section.advisories"
							:key="advisoryIndex"
							:advisory="advisory"
						/>
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
									v-for="[key, value] in getSettingsEntries(categorySettings)"
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
			</template>

			<!-- For advisory category, split into affecting and historical sections -->
			<template v-else>
				<!-- Affecting sections (always visible when expanded) -->
				<div
					v-for="(section, sectionIndex) in affectingSections"
					:key="`affecting-${sectionIndex}`"
					:class="$style.section"
				>
					<div :class="$style.sectionHeader">
						<N8nText :class="$style.sectionTitle" bold>{{ section.title }}</N8nText>
					</div>
					<N8nText :class="$style.sectionDescription" color="text-light" size="small">{{
						section.description
					}}</N8nText>

					<div
						v-if="isAdvisorySection(section) && section.advisories.length > 0"
						:class="$style.advisories"
					>
						<SecurityAdvisoryItem
							v-for="(advisory, advisoryIndex) in section.advisories"
							:key="advisoryIndex"
							:advisory="advisory"
						/>
					</div>

					<div v-if="section.recommendation" :class="$style.recommendation">
						<N8nIcon icon="lightbulb" size="small" :class="$style.recommendationIcon" />
						<N8nText size="small" color="text-light">{{ section.recommendation }}</N8nText>
					</div>
				</div>

				<!-- Historical advisories (collapsible, collapsed by default) -->
				<div v-if="historicalSections.length > 0" :class="$style.historicalContainer">
					<div
						:class="$style.historicalHeader"
						role="button"
						tabindex="0"
						:aria-expanded="historicalAdvisoriesExpanded"
						aria-controls="historical-advisories-content"
						data-test-id="historical-advisories-header"
						@click="toggleHistoricalAdvisories"
						@keydown.enter="toggleHistoricalAdvisories"
						@keydown.space.prevent="toggleHistoricalAdvisories"
					>
						<div :class="$style.historicalHeaderLeft">
							<N8nIcon icon="history" size="small" :class="$style.historicalIcon" />
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('settings.securityCenter.advisories.historicalTitle') }}
							</N8nText>
							<N8nBadge :class="$style.historicalBadge">
								{{ historicalAdvisoryCount }}
							</N8nBadge>
						</div>
						<N8nIcon
							:icon="historicalAdvisoriesExpanded ? 'chevron-up' : 'chevron-down'"
							size="small"
							:class="$style.historicalChevron"
						/>
					</div>

					<div
						v-if="historicalAdvisoriesExpanded"
						id="historical-advisories-content"
						:class="$style.historicalContent"
						role="region"
						:aria-label="i18n.baseText('settings.securityCenter.advisories.historicalTitle')"
					>
						<div
							v-for="(section, sectionIndex) in historicalSections"
							:key="`historical-${sectionIndex}`"
							:class="$style.section"
						>
							<div :class="$style.sectionHeader">
								<N8nText :class="$style.sectionTitle" bold>{{ section.title }}</N8nText>
							</div>
							<N8nText :class="$style.sectionDescription" color="text-light" size="small">{{
								section.description
							}}</N8nText>

							<div
								v-if="isAdvisorySection(section) && section.advisories.length > 0"
								:class="$style.advisories"
							>
								<SecurityAdvisoryItem
									v-for="(advisory, advisoryIndex) in section.advisories"
									:key="advisoryIndex"
									:advisory="advisory"
								/>
							</div>
						</div>
					</div>
				</div>
			</template>
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

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: -2px;
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

	&.info {
		color: var(--color--primary);
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

/* Historical advisories collapsible section */
.historicalContainer {
	margin-top: var(--spacing--xs);
}

.historicalHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--xs);
	cursor: pointer;
	border-radius: var(--radius);
	transition: background-color 0.2s ease;

	&:hover {
		background-color: var(--color--background--light-3);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: -2px;
	}
}

.historicalHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.historicalIcon {
	color: var(--color--text--tint-2);
}

.historicalBadge {
	background-color: var(--color--foreground--tint-1);
	color: var(--color--text--tint-1);
}

.historicalChevron {
	color: var(--color--text--tint-2);
}

.historicalContent {
	margin-top: var(--spacing--xs);
}
</style>
