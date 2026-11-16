/* global Vue, n8n */
// The built-in "Page summary" view. It runs in the view frame like a view from
// an MCP client, and it shows what the page context gives a view.
const { computed } = Vue;

const STICKY_NOTE = 'n8n-nodes-base.stickyNote';
const grid =
	'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing--2xs)';
const stack = 'display: flex; flex-direction: column; gap: var(--spacing--sm)';
const row = 'display: flex; align-items: center; gap: var(--spacing--2xs)';

export default {
	setup() {
		const context = n8n.useContext();
		const workflow = computed(() =>
			context.value.page === 'workflow' ? context.value.workflow : null,
		);
		const nodes = computed(() =>
			(workflow.value?.nodes ?? []).filter((node) => node.type !== STICKY_NOTE),
		);
		const triggers = computed(() => nodes.value.filter((node) => node.isTrigger));
		const stats = computed(() => [
			{ key: 'nodes', icon: 'box', value: nodes.value.length },
			{ key: 'triggers', icon: 'zap', value: triggers.value.length },
			{
				key: 'services',
				icon: 'plug',
				value: new Set(
					nodes.value.filter((node) => node.isService).map((node) => node.displayName ?? node.type),
				).size,
			},
			{ key: 'disabled', icon: 'power-off', value: nodes.value.filter((n) => n.disabled).length },
		]);
		return { context, workflow, triggers, stats, grid, stack, row, t: n8n.t };
	},
	template: `
		<section data-test-id="page-summary" :style="stack">
			<template v-if="context.page === 'workflow'">
				<template v-if="workflow">
					<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing--xs)">
						<N8nHeading tag="h2" size="medium" bold data-test-id="page-summary-workflow-name" style="overflow-wrap: anywhere">{{ workflow.name }}</N8nHeading>
						<N8nBadge :variant="workflow.active ? 'success' : 'subtle'" data-test-id="page-summary-state">
							{{ workflow.active ? t('uiExtensions.pageSummary.workflow.active') : t('uiExtensions.pageSummary.workflow.inactive') }}
						</N8nBadge>
					</div>
					<div :style="grid">
						<N8nCard v-for="stat in stats" :key="stat.key">
							<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs)">
								<span :style="row">
									<N8nIcon :icon="stat.icon" size="small" color="text-light" />
									<N8nText size="small" color="text-light">{{ t('uiExtensions.pageSummary.stats.' + stat.key) }}</N8nText>
								</span>
								<N8nHeading tag="p" size="xlarge" bold :data-test-id="'page-summary-stat-' + stat.key">{{ stat.value }}</N8nHeading>
							</div>
						</N8nCard>
					</div>
					<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs)">
						<N8nHeading tag="h3" size="small" bold>{{ t('uiExtensions.pageSummary.triggers.heading') }}</N8nHeading>
						<N8nCallout v-if="triggers.length === 0" theme="warning" data-test-id="page-summary-no-trigger">{{ t('uiExtensions.pageSummary.triggers.empty') }}</N8nCallout>
						<N8nCard v-for="trigger in triggers" :key="trigger.name" data-test-id="page-summary-trigger">
							<span :style="row">
								<N8nIcon icon="zap" size="medium" color="warning" />
								<span style="display: flex; flex-direction: column; min-width: 0">
									<N8nText size="small" bold>{{ trigger.name }}</N8nText>
									<N8nText size="xsmall" color="text-light">{{ trigger.displayName ?? trigger.type }}</N8nText>
								</span>
							</span>
						</N8nCard>
					</div>
				</template>
				<N8nCallout v-else theme="info">{{ t('uiExtensions.view.hiddenWorkflow') }}</N8nCallout>
			</template>
			<template v-else-if="context.page === 'workflows'">
				<N8nHeading tag="h2" size="medium" bold data-test-id="page-summary-workflows-heading">{{ t('uiExtensions.pageSummary.workflows.heading') }}</N8nHeading>
				<N8nCard>
					<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs)">
						<span :style="row">
							<N8nIcon icon="workflow" size="small" color="text-light" />
							<N8nText size="small" color="text-light">{{ t('uiExtensions.pageSummary.workflows.total') }}</N8nText>
						</span>
						<N8nHeading tag="p" size="xlarge" bold data-test-id="page-summary-workflow-count">{{ context.totalWorkflows ?? '-' }}</N8nHeading>
					</div>
				</N8nCard>
				<N8nCallout theme="info">{{ t('uiExtensions.pageSummary.workflows.hint') }}</N8nCallout>
			</template>
			<template v-else>
				<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.pageSummary.other.heading') }}</N8nHeading>
				<N8nText tag="p" size="small" data-test-id="page-summary-route">{{ context.routeName ?? '-' }}</N8nText>
				<N8nCallout theme="info">{{ t('uiExtensions.pageSummary.other.hint') }}</N8nCallout>
			</template>
		</section>
	`,
};
