<script lang="ts" setup>
import { N8nText, N8nBadge, N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AdvisoryDetails } from '../securityCenter.api';

defineProps<{
	advisory: AdvisoryDetails;
}>();

const i18n = useI18n();

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
</script>

<template>
	<div :class="$style.advisoryItem" data-test-id="advisory-item">
		<div :class="$style.advisoryHeader">
			<N8nBadge
				:class="[$style.severityBadge, $style[`severity-${getSeverityClass(advisory.severity)}`]]"
			>
				{{ i18n.baseText(`settings.securityCenter.advisories.severity.${advisory.severity}`) }}
			</N8nBadge>
			<N8nLink
				:to="advisory.htmlUrl"
				:new-window="true"
				rel="noopener noreferrer"
				:class="$style.advisoryId"
			>
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
					{{ i18n.baseText('settings.securityCenter.advisories.vulnerableRange') }}:
				</N8nText>
				<N8nText size="small" :class="$style.advisoryVersion">
					{{ advisory.vulnerableVersionRange }}
				</N8nText>
			</div>
			<div v-if="advisory.patchedVersions" :class="$style.advisoryMetaItem">
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.securityCenter.advisories.patchedIn') }}:
				</N8nText>
				<N8nText size="small" :class="$style.advisoryVersion">
					{{ advisory.patchedVersions }}
				</N8nText>
			</div>
			<div :class="$style.advisoryMetaItem">
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.securityCenter.advisories.publishedAt') }}:
				</N8nText>
				<N8nText size="small">{{ formatDate(advisory.publishedAt) }}</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
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
