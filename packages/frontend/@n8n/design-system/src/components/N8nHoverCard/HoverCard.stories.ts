import type { StoryFn } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import N8nHoverCard from './HoverCard.vue';
import N8nBadge from '../N8nBadge/Badge.vue';
import N8nButton from '../N8nButton/Button.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nTag from '../N8nTag/Tag.vue';
import N8nText from '../N8nText/Text.vue';

export default {
	title: 'Core/Hover Card',
	component: N8nHoverCard,
	argTypes: {
		openDelay: { control: 'number' },
		closeDelay: { control: 'number' },
		side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
		align: { control: 'select', options: ['start', 'center', 'end'] },
		maxWidth: { control: 'text' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A hover/focus-triggered floating card for lightweight contextual previews and structured metadata.',
			},
		},
	},
};

const WorkflowPreviewTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { N8nHoverCard, N8nButton, N8nIcon, N8nText, N8nBadge },
	template: `
		<div style="padding: 96px; display: flex; justify-content: center;">
			<N8nHoverCard v-bind="args">
				<template #trigger>
					<N8nButton type="secondary">Customer onboarding</N8nButton>
				</template>
				<template #content>
					<section style="width: 360px; padding: var(--spacing--sm); display: flex; flex-direction: column; gap: var(--spacing--sm);">
						<header style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing--sm);">
							<div style="display: flex; gap: var(--spacing--xs); align-items: flex-start;">
								<div style="height: 32px; width: 32px; border-radius: var(--radius--sm); display: grid; place-items: center; background: var(--color--foreground--base); color: var(--color--text--xlight);">
									<N8nIcon icon="workflow" size="medium" />
								</div>
								<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs);">
									<N8nText bold>Customer onboarding</N8nText>
									<N8nText size="small" color="text-light">Assigns setup tasks, enriches CRM data, and notifies account owners.</N8nText>
								</div>
							</div>
							<N8nBadge theme="secondary" size="small">Active</N8nBadge>
						</header>

						<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing--2xs);">
							<div style="padding: var(--spacing--2xs); border: var(--border); border-radius: var(--radius--xs);">
								<N8nText size="xsmall" color="text-light">Success rate</N8nText>
								<N8nText bold>99.2%</N8nText>
							</div>
							<div style="padding: var(--spacing--2xs); border: var(--border); border-radius: var(--radius--xs);">
								<N8nText size="xsmall" color="text-light">Avg. runtime</N8nText>
								<N8nText bold>42s</N8nText>
							</div>
							<div style="padding: var(--spacing--2xs); border: var(--border); border-radius: var(--radius--xs);">
								<N8nText size="xsmall" color="text-light">Runs today</N8nText>
								<N8nText bold>184</N8nText>
							</div>
						</div>

						<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<N8nText size="small" color="text-light">Last failed node</N8nText>
								<N8nText size="small">HubSpot: Update company</N8nText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<N8nText size="small" color="text-light">Owner</N8nText>
								<N8nText size="small">Growth Ops</N8nText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<N8nText size="small" color="text-light">Last edited</N8nText>
								<N8nText size="small">Yesterday by Maya Chen</N8nText>
							</div>
						</div>
					</section>
				</template>
			</N8nHoverCard>
		</div>
	`,
});

export const WorkflowPreview = WorkflowPreviewTemplate.bind({});
WorkflowPreview.args = {
	maxWidth: '380px',
	side: 'right',
	align: 'center',
};

const EnvironmentTemplate: StoryFn = (args) => ({
	setup() {
		const isOpen = ref(false);
		return { args, isOpen };
	},
	components: { N8nHoverCard, N8nTag, N8nText, N8nBadge },
	template: `
		<div style="padding: 96px; display: flex; flex-direction: column; align-items: center; gap: var(--spacing--sm);">
			<N8nText size="small" color="text-light">Open: {{ isOpen }}</N8nText>
			<N8nHoverCard v-model:open="isOpen" v-bind="args">
				<template #trigger>
					<N8nTag text="Production" type="success" />
				</template>
				<template #content>
					<section style="width: 340px; padding: var(--spacing--sm); display: flex; flex-direction: column; gap: var(--spacing--sm);">
						<header style="display: flex; justify-content: space-between; gap: var(--spacing--sm); align-items: flex-start;">
							<div>
								<N8nText bold>Production environment</N8nText>
								<N8nText size="small" color="text-light">Webhook traffic is routed to this workflow version.</N8nText>
							</div>
							<N8nBadge theme="secondary" size="small">Healthy</N8nBadge>
						</header>

						<div style="padding: var(--spacing--xs); border-radius: var(--radius--xs); background: var(--color--background--light); display: flex; flex-direction: column; gap: var(--spacing--2xs);">
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<N8nText size="small" color="text-light">Deployed version</N8nText>
								<N8nText size="small" bold>v42</N8nText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<N8nText size="small" color="text-light">Last deploy</N8nText>
								<N8nText size="small">14 minutes ago</N8nText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<N8nText size="small" color="text-light">Deploy author</N8nText>
								<N8nText size="small">Maya Chen</N8nText>
							</div>
						</div>

						<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
							<N8nText size="small" bold>Recent checks</N8nText>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<N8nText size="small">Credential validation</N8nText>
								<N8nText size="small" color="success">Passed</N8nText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<N8nText size="small">Webhook response time</N8nText>
								<N8nText size="small">218ms p95</N8nText>
							</div>
						</div>
					</section>
				</template>
			</N8nHoverCard>
		</div>
	`,
});

export const ControlledEnvironment = EnvironmentTemplate.bind({});
ControlledEnvironment.args = {
	side: 'top',
	closeDelay: 600,
	maxWidth: '360px',
};

const SharedReferenceTemplate: StoryFn = (args) => ({
	setup() {
		const open = ref(false);
		const activeReference = ref<HTMLElement | undefined>();
		const activeStepId = ref('webhook');
		const steps = [
			{
				id: 'webhook',
				label: 'Webhook received',
				duration: '12ms',
				status: 'Success',
				detail: 'POST /lead-created matched the production webhook URL.',
				input: 'Lead payload, 18 fields',
				output: 'Execution started',
			},
			{
				id: 'agent',
				label: 'AI agent planned',
				duration: '5.8s',
				status: 'Success',
				detail: 'Selected CRM enrichment and owner assignment tools.',
				input: 'Lead profile + account context',
				output: '3-step action plan',
			},
			{
				id: 'http',
				label: 'HTTP request sent',
				duration: '640ms',
				status: 'Retried',
				detail: 'First HubSpot request timed out; retry succeeded.',
				input: 'Company enrichment request',
				output: 'Company size and domain',
			},
			{
				id: 'slack',
				label: 'Slack notified',
				duration: '210ms',
				status: 'Success',
				detail: 'Sent account handoff summary to #growth-ops.',
				input: 'Owner, score, next task',
				output: 'Message timestamp',
			},
		];
		const activeStep = computed(
			() => steps.find((step) => step.id === activeStepId.value) ?? steps[0],
		);

		function showCard(event: MouseEvent, stepId: string) {
			if (!(event.currentTarget instanceof HTMLElement)) return;
			activeReference.value = event.currentTarget;
			activeStepId.value = stepId;
			open.value = true;
		}

		function hideCard() {
			open.value = false;
			activeReference.value = undefined;
		}

		return { args, open, activeReference, activeStep, steps, showCard, hideCard };
	},
	components: { N8nHoverCard, N8nText, N8nBadge },
	template: `
		<div style="padding: 112px;">
			<N8nHoverCard
				v-model:open="open"
				hide-trigger
				:reference="activeReference"
				v-bind="args"
			>
				<template #content>
					<section style="width: 360px; padding: var(--spacing--sm); display: flex; flex-direction: column; gap: var(--spacing--sm);">
						<header style="display: flex; justify-content: space-between; gap: var(--spacing--sm); align-items: flex-start;">
							<div>
								<N8nText bold>{{ activeStep.label }}</N8nText>
								<N8nText size="small" color="text-light">{{ activeStep.detail }}</N8nText>
							</div>
							<N8nBadge size="small" theme="secondary">{{ activeStep.status }}</N8nBadge>
						</header>

						<div style="display: grid; grid-template-columns: auto 1fr; gap: var(--spacing--2xs) var(--spacing--sm);">
							<N8nText size="small" color="text-light">Duration</N8nText>
							<N8nText size="small">{{ activeStep.duration }}</N8nText>
							<N8nText size="small" color="text-light">Input</N8nText>
							<N8nText size="small">{{ activeStep.input }}</N8nText>
							<N8nText size="small" color="text-light">Output</N8nText>
							<N8nText size="small">{{ activeStep.output }}</N8nText>
						</div>
					</section>
				</template>
			</N8nHoverCard>

			<div style="display: flex; gap: 1px; height: 36px;">
				<button
					v-for="(step, index) in steps"
					:key="step.id"
					type="button"
					style="border: 0; min-width: 112px; padding: 0 var(--spacing--xs); border-radius: var(--radius--sm); background: var(--color--foreground--base); color: var(--color--text--xlight); cursor: pointer;"
					@mouseenter="showCard($event, step.id)"
					@mouseleave="hideCard"
					@focus="showCard($event, step.id)"
					@blur="hideCard"
				>
					{{ index + 1 }}. {{ step.label.split(' ')[0] }}
				</button>
			</div>
		</div>
	`,
});

export const SharedReference = SharedReferenceTemplate.bind({});
SharedReference.args = {
	side: 'top',
	align: 'center',
	sideOffset: 8,
	closeDelay: 0,
	maxWidth: '380px',
};

const ScrollableTemplate: StoryFn = (args) => ({
	setup: () => ({
		args,
		executions: [
			{
				id: 1852,
				status: 'Success',
				workflowName: 'New trial signup',
				duration: '34s',
				started: '2 min ago',
			},
			{
				id: 1851,
				status: 'Success',
				workflowName: 'Demo booked',
				duration: '41s',
				started: '9 min ago',
			},
			{
				id: 1850,
				status: 'Warning',
				workflowName: 'Lead enriched',
				duration: '1m 12s',
				started: '18 min ago',
			},
			{
				id: 1849,
				status: 'Success',
				workflowName: 'Account owner assigned',
				duration: '29s',
				started: '26 min ago',
			},
			{
				id: 1848,
				status: 'Success',
				workflowName: 'Lifecycle updated',
				duration: '38s',
				started: '33 min ago',
			},
			{
				id: 1847,
				status: 'Error',
				workflowName: 'CRM sync',
				duration: '7s',
				started: '41 min ago',
			},
			{
				id: 1846,
				status: 'Success',
				workflowName: 'Welcome email queued',
				duration: '23s',
				started: '48 min ago',
			},
		],
	}),
	components: { N8nHoverCard, N8nButton, N8nText, N8nBadge },
	template: `
		<div style="padding: 96px; display: flex; justify-content: center;">
			<N8nHoverCard v-bind="args">
				<template #trigger>
					<N8nButton type="secondary">Recent executions</N8nButton>
				</template>
				<template #content>
					<section style="width: 380px; padding: var(--spacing--sm); display: flex; flex-direction: column; gap: var(--spacing--sm);">
						<header>
							<N8nText bold>Recent executions</N8nText>
							<N8nText size="small" color="text-light">Last hour of production runs for this workflow.</N8nText>
						</header>

						<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
							<div v-for="execution in executions" :key="execution.id" style="display: grid; grid-template-columns: 1fr auto; gap: var(--spacing--3xs) var(--spacing--sm); padding: var(--spacing--2xs); border: var(--border); border-radius: var(--radius--xs);">
								<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs);">
									<N8nText size="small" bold>#{{ execution.id }} · {{ execution.workflowName }}</N8nText>
									<N8nText size="xsmall" color="text-light">Started {{ execution.started }} · Runtime {{ execution.duration }}</N8nText>
								</div>
								<N8nBadge size="small" theme="secondary">{{ execution.status }}</N8nBadge>
							</div>
						</div>
					</section>
				</template>
			</N8nHoverCard>
		</div>
	`,
});

export const ScrollableContent = ScrollableTemplate.bind({});
ScrollableContent.args = {
	maxWidth: '400px',
	maxHeight: '320px',
	enableScrolling: true,
};
