<script setup lang="ts">
import { computed } from 'vue';
import { N8nBadge, N8nButton, N8nHeading, N8nText, N8nTooltip } from '@n8n/design-system';

/**
 * PoC (Project Home & IA): mocked project-settings sections for feature areas
 * that are not shipped yet. Content shapes follow the corresponding PRDs so
 * the demo previews a realistic contract.
 */

const props = defineProps<{ section: string }>();

interface StubRow {
	title: string;
	description: string;
	control: 'toggle-on' | 'toggle-off' | 'value' | 'action';
	value?: string;
}

interface StubConfig {
	title: string;
	description: string;
	rows: StubRow[];
}

const stubs: Record<string, StubConfig> = {
	'credential-resolvers': {
		title: 'Credential resolvers',
		description: 'Resolve credentials at runtime from an external system instead of storing them.',
		rows: [
			{
				title: 'Default resolver',
				description: 'Used when a credential does not specify its own resolver.',
				control: 'value',
				value: 'None',
			},
			{
				title: 'Allow workflow-level overrides',
				description: 'Workflows may select a different resolver than the project default.',
				control: 'toggle-off',
			},
		],
	},
	'community-nodes': {
		title: 'Community nodes',
		description: 'Control which community nodes are available inside this project.',
		rows: [
			{
				title: 'Allow community nodes',
				description: 'Inherited from instance settings. Override per project.',
				control: 'toggle-on',
			},
			{
				title: 'Allowed packages',
				description: 'Only these packages can be used in this project.',
				control: 'value',
				value: 'All allowed',
			},
		],
	},
	repository: {
		title: 'Repository',
		description: 'Connect this project to its own Git repository and branch.',
		rows: [
			{
				title: 'Repository',
				description: 'Where this project’s workflows are versioned.',
				control: 'value',
				value: 'git@github.com:acme/n8n-design-team.git',
			},
			{
				title: 'Branch',
				description: 'Tracked branch for this project.',
				control: 'value',
				value: 'main',
			},
			{
				title: 'Protected',
				description: 'Block direct edits to published workflows in this project.',
				control: 'toggle-off',
			},
		],
	},
	environments: {
		title: 'Environments',
		description: 'Promote this project’s workflows between environments.',
		rows: [
			{
				title: 'Promotion target',
				description: 'Destination instance that pulls this project’s candidates.',
				control: 'value',
				value: 'Production (prod.acme.n8n.cloud)',
			},
			{
				title: 'Require review before promotion',
				description: 'Candidates need an approved review before they can be pulled.',
				control: 'toggle-on',
			},
		],
	},
	'workflow-review': {
		title: 'Workflow review',
		description: 'Require a second pair of eyes before workflow changes go live.',
		rows: [
			{
				title: 'Reviews required',
				description: 'Publishing a workflow in this project requires an approved review.',
				control: 'toggle-on',
			},
			{
				title: 'Reviewers',
				description: 'Project admins can approve reviews.',
				control: 'value',
				value: 'Project admins (3)',
			},
		],
	},
	'node-controls': {
		title: 'Node controls',
		description: 'Allow or ban specific nodes inside this project.',
		rows: [
			{
				title: 'Banned nodes',
				description: 'These nodes cannot be added to workflows in this project.',
				control: 'value',
				value: 'Execute Command, SSH',
			},
			{
				title: 'Enforce at execution time',
				description: 'Also block existing workflows that use banned nodes.',
				control: 'toggle-off',
			},
		],
	},
	'workflow-rules': {
		title: 'Workflow rules',
		description: 'Rules every workflow in this project must satisfy.',
		rows: [
			{
				title: 'Error handling required',
				description: 'Production workflows must have an error workflow or error output wired.',
				control: 'toggle-on',
			},
			{
				title: 'Naming convention',
				description: 'Workflow names must match the project convention.',
				control: 'value',
				value: '[team]-[purpose]',
			},
		],
	},
	'secrets-policy': {
		title: 'External secrets policy',
		description: 'Constrain how workflows in this project may use external secrets.',
		rows: [
			{
				title: 'Allowed secret prefixes',
				description: 'Workflows can only reference secrets under these paths.',
				control: 'value',
				value: 'design-team/*',
			},
			{
				title: 'Block plaintext tokens',
				description: 'Flag credentials that embed tokens directly in fields.',
				control: 'toggle-on',
			},
		],
	},
};

const config = computed(() => stubs[props.section]);
</script>

<template>
	<div v-if="config" :class="$style.stub" data-test-id="project-setting-stub">
		<div :class="$style.header">
			<N8nHeading tag="h1" size="xlarge">{{ config.title }}</N8nHeading>
			<N8nTooltip content="Demo data: this feature area is mocked in the PoC">
				<span :class="$style.demoBadge">demo</span>
			</N8nTooltip>
		</div>
		<N8nText color="text-light">{{ config.description }}</N8nText>

		<div :class="$style.rows">
			<div v-for="row in config.rows" :key="row.title" :class="$style.row">
				<div :class="$style.rowMain">
					<N8nText bold>{{ row.title }}</N8nText>
					<N8nText size="small" color="text-light">{{ row.description }}</N8nText>
				</div>
				<div :class="$style.rowControl">
					<N8nText v-if="row.control === 'value'" size="small">{{ row.value }}</N8nText>
					<N8nButton v-else-if="row.control === 'action'" size="small" type="secondary">
						{{ row.value }}
					</N8nButton>
					<div
						v-else
						:class="[$style.toggle, row.control === 'toggle-on' && $style.toggleOn]"
						role="switch"
						:aria-checked="row.control === 'toggle-on'"
					>
						<div :class="$style.knob" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.stub {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	max-width: 800px;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.demoBadge {
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	line-height: 1.6;
	padding: 0 var(--spacing--4xs);
}

.rows {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-3);
	margin-top: var(--spacing--xs);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding: var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.rowMain {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.rowControl {
	flex-shrink: 0;
}

.toggle {
	width: 32px;
	height: 18px;
	border-radius: 9px;
	background: var(--color--foreground);
	position: relative;
	cursor: not-allowed;
}

.toggleOn {
	background: var(--color--primary);
}

.knob {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: var(--color--background--light-3);
}

.toggleOn .knob {
	left: auto;
	right: 2px;
}
</style>
