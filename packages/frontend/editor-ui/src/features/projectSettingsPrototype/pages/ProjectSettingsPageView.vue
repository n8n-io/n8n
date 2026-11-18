<script setup lang="ts">
import { computed, type Component } from 'vue';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import { isSettingsPage } from '../nav/model';
import { projectPage, type SettingsPageId } from '../nav/pages';
import { useProtoChrome } from '../nav/useProtoChrome';
import { protoParams } from '../params';
import { useCan } from '../state/session';
import AuditLogPage from './AuditLogPage.vue';
import ExecutionLimitsPage from './ExecutionLimitsPage.vue';
import ExternalSecretsPage from './ExternalSecretsPage.vue';
import GeneralPage from './GeneralPage.vue';
import MembersPage from './MembersPage.vue';
import NodeCredentialAccessPage from './NodeCredentialAccessPage.vue';
import OpenTelemetryPage from './OpenTelemetryPage.vue';
import SelfHealingPage from './SelfHealingPage.vue';
import WorkersPage from './WorkersPage.vue';

/**
 * One page of a project's settings, inside the frame the variant asks for.
 * The pages themselves never know which variant they're in.
 */
const PAGES: Record<SettingsPageId, Component> = {
	general: GeneralPage,
	members: MembersPage,
	'node-and-credential-access': NodeCredentialAccessPage,
	'execution-limits': ExecutionLimitsPage,
	'external-secrets': ExternalSecretsPage,
	'audit-log': AuditLogPage,
	'self-healing': SelfHealingPage,
	workers: WorkersPage,
	opentelemetry: OpenTelemetryPage,
};

/** Pages built around a table, which need more room than a form. */
const WIDE_PAGES: SettingsPageId[] = ['members', 'audit-log', 'node-and-credential-access'];

const isSettingsPageId = (value: string | undefined): value is SettingsPageId =>
	value !== undefined && value in PAGES;

const { projectId, page, chrome } = useProtoChrome();
const can = useCan();

const pageId = computed(() => (isSettingsPageId(page.value) ? page.value : undefined));
const def = computed(() => (pageId.value ? projectPage(pageId.value) : undefined));
const component = computed(() => (pageId.value ? PAGES[pageId.value] : undefined));

/** Members can sit with the project's resources, where editors may see it too. */
const isResource = computed(
	() => pageId.value !== undefined && !isSettingsPage(pageId.value, protoParams),
);

const allowed = computed(() =>
	isResource.value ? can('project:members:view') : can('project:settings:view'),
);

/**
 * The project header carries the tabs and the Settings menu. The settings
 * area has its own frame, and the visual refresh names the page in its panel.
 */
const showProjectHeader = computed(
	() =>
		chrome.value.frame !== 'settings' &&
		(protoParams.shell === 'standard' || protoParams.variant === 'menu' || isResource.value),
);

/** A resource is named by its tab or its navigation link, like Credentials is. */
const showPageHeader = computed(() => !isResource.value);

const layoutStyle = computed(() =>
	pageId.value && WIDE_PAGES.includes(pageId.value)
		? { '--settings-content--max-width': '60rem' }
		: undefined,
);

const projectHome = computed(() => ({
	name: VIEWS.PROJECTS_WORKFLOWS,
	params: { projectId: projectId.value },
}));
</script>

<template>
	<div :class="$style.view" data-test-id="proto-project-settings-view" :data-page="page">
		<div v-if="showProjectHeader" :class="$style.projectHeader">
			<ProjectHeader />
		</div>
		<N8nSettingsLayout :style="layoutStyle">
			<div v-if="!allowed" :class="$style.notice" data-test-id="proto-no-access">
				<span :class="$style.noticeIcon">
					<N8nIcon icon="lock" size="large" />
				</span>
				<N8nHeading tag="h1" size="large" color="text-dark">
					You don't have access to this project's settings
				</N8nHeading>
				<N8nText color="text-light">
					Project admins manage settings. Ask one of them if something needs to change.
				</N8nText>
				<N8nButton variant="outline" :to="projectHome" data-test-id="proto-no-access-back">
					Go to workflows
				</N8nButton>
			</div>
			<template v-else-if="def && component && projectId">
				<N8nSettingsPageHeader
					v-if="showPageHeader"
					:title="def.label"
					:description="def.description"
					:show-docs-link="false"
					:heading-tag="showProjectHeader ? 'h3' : 'h1'"
				/>
				<component :is="component" :key="`${projectId}:${pageId}`" :project-id="projectId" />
			</template>
			<div v-else :class="$style.notice" data-test-id="proto-page-not-found">
				<N8nHeading tag="h1" size="large" color="text-dark">This page doesn't exist</N8nHeading>
				<N8nText color="text-light">The link may be out of date.</N8nText>
				<N8nButton variant="outline" :to="projectHome">Go to workflows</N8nButton>
			</div>
		</N8nSettingsLayout>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.view {
	width: 100%;
	min-height: 100%;
}

/* The same inset as the project's resource pages, so the header doesn't move between them. */
.projectHeader {
	box-sizing: border-box;
	width: 100%;
	max-width: var(--content-container--width);
	margin-inline: auto;
	padding: var(--spacing--lg) var(--spacing--2xl) 0;

	@include breakpoints.breakpoint('sm-and-down') {
		padding: var(--spacing--sm) var(--spacing--sm) 0;
	}
}

.notice {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xl) var(--spacing--lg);
	text-align: center;
}

.noticeIcon {
	display: grid;
	place-items: center;
	width: var(--spacing--2xl);
	height: var(--spacing--2xl);
	border-radius: var(--radius--full, 999px);
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
}
</style>
