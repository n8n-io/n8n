/* global Vue, n8n */
// The built-in "Integrations" view: the apps and services that the open
// workflow connects to, grouped by node type.
const { computed } = Vue;

const STICKY_NOTE = 'n8n-nodes-base.stickyNote';
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
		const services = computed(() => {
			const byName = new Map();
			for (const node of nodes.value) {
				const name = node.displayName ?? node.type;
				const service = byName.get(name) ?? { name, nodes: [], isTrigger: false };
				service.nodes.push(node.name);
				service.isTrigger = service.isTrigger || node.isTrigger === true;
				byName.set(name, service);
			}
			return [...byName.values()].sort(
				(a, b) => b.nodes.length - a.nodes.length || a.name.localeCompare(b.name),
			);
		});
		return { context, workflow, nodes, services, row, t: n8n.t };
	},
	template: `
		<section data-test-id="integrations" style="display: flex; flex-direction: column; gap: var(--spacing--sm)">
			<template v-if="context.page !== 'workflow'">
				<div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing--2xs); padding: var(--spacing--lg) 0; text-align: center">
					<N8nIcon icon="plug" size="xlarge" color="text-light" />
					<N8nText size="small" color="text-light">{{ t('uiExtensions.integrations.openWorkflow') }}</N8nText>
				</div>
			</template>
			<N8nCallout v-else-if="!workflow" theme="info">{{ t('uiExtensions.view.hiddenWorkflow') }}</N8nCallout>
			<template v-else>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs)">
					<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.integrations.heading') }}</N8nHeading>
					<N8nText size="small" color="text-light" data-test-id="integrations-summary">{{ t('uiExtensions.integrations.summary', { services: services.length, nodes: nodes.length }) }}</N8nText>
				</div>
				<N8nCallout v-if="services.length === 0" theme="info">{{ t('uiExtensions.integrations.empty') }}</N8nCallout>
				<N8nCard v-for="service in services" :key="service.name" data-test-id="integrations-service">
					<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs)">
						<div style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs)">
							<span :style="row">
								<N8nIcon :icon="service.isTrigger ? 'zap' : 'plug'" size="medium" :color="service.isTrigger ? 'warning' : 'text-light'" />
								<N8nText size="small" bold data-test-id="integrations-service-name">{{ service.name }}</N8nText>
								<N8nBadge v-if="service.isTrigger" variant="warning" size="xsmall">{{ t('uiExtensions.integrations.trigger') }}</N8nBadge>
							</span>
							<N8nBadge variant="subtle">{{ service.nodes.length }}</N8nBadge>
						</div>
						<span style="display: flex; flex-wrap: wrap; gap: var(--spacing--4xs)">
							<N8nTag v-for="name in service.nodes" :key="name" :text="name" :clickable="false" />
						</span>
					</div>
				</N8nCard>
			</template>
		</section>
	`,
};
