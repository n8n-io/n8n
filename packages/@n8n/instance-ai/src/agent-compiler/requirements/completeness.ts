import type { RequirementIssue } from '../../workflow-compiler/requirements/types';
import { missingOperationRequirements } from '../../workflow-compiler/requirements/completeness';
import type { NodeRegistry } from '../../workflow-compiler/catalog/node-registry';
import type { AgentCapabilityCatalog } from '../catalog/capabilities';
import { findByName } from '../catalog/capabilities';
import type { AgentRequirements } from './types';

/** Stage 1: do we understand what the agent is for and where it lives? */
export function missingAgentBehaviorRequirements(
	requirements: AgentRequirements,
	catalog: AgentCapabilityCatalog,
): RequirementIssue[] {
	const issues: RequirementIssue[] = [];
	const { purpose } = requirements;
	if (purpose.status !== 'resolved')
		issues.push({
			field: 'purpose',
			reason: 'The request does not say what the agent should do.',
			question: purpose.status === 'missing' ? purpose.question : 'What should this agent do?',
		});
	const supportedTypes = new Set(catalog.channels.map((channel) => channel.type));
	for (const mention of requirements.channels) {
		if (requirements.answers[`channels.${mention.name}`] !== undefined) continue;
		if (mention.supported && mention.type && supportedTypes.has(mention.type)) continue;
		const options = catalog.channels.map((channel) => channel.label).join(', ');
		issues.push({
			field: `channels.${mention.name}`,
			reason: `${mention.name} is not a supported chat channel on this instance.`,
			question: `Agents cannot connect to ${mention.name} here. Supported channels: ${options || 'none'}. Should the agent use one of those, run only in Preview, or be reached through a workflow endpoint instead?`,
			candidates: [
				...catalog.channels.map((channel) => channel.type),
				'preview',
				'workflow_endpoint',
			],
		});
	}
	return issues;
}

/** Stage 2: once tools are chosen, each one may need values and references must resolve. */
export function missingAgentResourceRequirements(
	requirements: AgentRequirements,
	catalog: AgentCapabilityCatalog,
	registry: NodeRegistry,
): RequirementIssue[] {
	const issues = missingOperationRequirements(
		{
			intent: requirements.intent,
			trigger: requirements.intent,
			triggerParams: {},
			actions: requirements.toolActions,
			responseFields: [],
			requiredFields: [],
			emailFields: [],
			workflowName: requirements.name,
			errorPolicy: requirements.intent,
			answers: requirements.answers,
		},
		registry,
	).map((issue) => ({ ...issue, field: issue.field.replace(/^actions\./, 'toolActions.') }));
	for (const name of requirements.subAgentNames) {
		const matches = findByName(catalog.agents, name);
		if (matches.length === 1 || requirements.answers[`subAgents.${name}`] !== undefined) continue;
		issues.push({
			field: `subAgents.${name}`,
			reason:
				matches.length === 0
					? 'No agent in this project has that name.'
					: 'Several agents match that name.',
			question:
				matches.length === 0
					? `No agent named "${name}" exists in this project. Which agent should it delegate to? Available: ${catalog.agents.map((agent) => agent.name).join(', ') || 'none'}.`
					: `Which agent is "${name}": ${matches.map((agent) => agent.name).join(' or ')}?`,
			candidates: (matches.length > 0 ? matches : catalog.agents).map((agent) => agent.agentId),
		});
	}
	for (const schedule of requirements.schedules) {
		if (schedule.cron || requirements.answers[`schedules.${schedule.text}`] !== undefined) continue;
		issues.push({
			field: `schedules.${schedule.text}`,
			reason: 'The schedule could not be turned into a cron expression.',
			question: `How often exactly should "${schedule.text}" run (for example "every weekday at 9am")?`,
		});
	}
	return issues;
}
