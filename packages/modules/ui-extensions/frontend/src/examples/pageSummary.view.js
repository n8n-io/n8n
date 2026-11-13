/* global Vue, n8n */
// The built-in "Page summary" view. It runs in the view frame like a view from
// an MCP client, and it shows what the page context gives a view.
const { computed } = Vue;

export default {
	setup() {
		const context = n8n.useContext();
		const workflow = computed(() =>
			context.value.page === 'workflow' ? context.value.workflow : null,
		);
		const nodes = computed(() => workflow.value?.nodes ?? []);
		return { context, workflow, nodes, t: n8n.t };
	},
	template: `
		<section data-test-id="page-summary" style="display: flex; flex-direction: column; gap: var(--spacing--xs)">
			<template v-if="context.page === 'workflow'">
				<template v-if="workflow">
					<N8nHeading tag="h2" size="medium" bold data-test-id="page-summary-workflow-name">{{ workflow.name }}</N8nHeading>
					<div>
						<N8nBadge :variant="workflow.active ? 'success' : 'subtle'">
							{{ workflow.active ? t('uiExtensions.pageSummary.workflow.active') : t('uiExtensions.pageSummary.workflow.inactive') }}
						</N8nBadge>
					</div>
					<N8nText tag="p" size="small" color="text-light" data-test-id="page-summary-node-count">
						{{ t('uiExtensions.pageSummary.workflow.nodeCount', { count: nodes.length }) }}
					</N8nText>
					<N8nText v-if="nodes.length === 0" tag="p" size="small">{{ t('uiExtensions.pageSummary.workflow.noNodes') }}</N8nText>
					<ul v-else style="display: flex; flex-direction: column; gap: var(--spacing--3xs); padding: 0; margin: 0; list-style: none">
						<li v-for="node in nodes" :key="node.name" style="display: flex; flex-direction: column">
							<N8nText size="small" bold>{{ node.name }}</N8nText>
							<N8nText size="xsmall" color="text-light">{{ node.type }}</N8nText>
						</li>
					</ul>
				</template>
				<N8nText v-else tag="p" size="small">{{ t('uiExtensions.pageSummary.workflow.hidden') }}</N8nText>
			</template>
			<template v-else-if="context.page === 'workflows'">
				<N8nHeading tag="h2" size="medium" bold data-test-id="page-summary-workflows-heading">{{ t('uiExtensions.pageSummary.workflows.heading') }}</N8nHeading>
				<N8nText tag="p" size="small" data-test-id="page-summary-workflow-count">
					{{ t('uiExtensions.pageSummary.workflows.total', { count: context.totalWorkflows ?? '-' }) }}
				</N8nText>
				<N8nText tag="p" size="small" color="text-light">{{ t('uiExtensions.pageSummary.workflows.hint') }}</N8nText>
			</template>
			<template v-else>
				<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.pageSummary.other.heading') }}</N8nHeading>
				<N8nText tag="p" size="small" data-test-id="page-summary-route">{{ context.routeName ?? '-' }}</N8nText>
			</template>
		</section>
	`,
};
