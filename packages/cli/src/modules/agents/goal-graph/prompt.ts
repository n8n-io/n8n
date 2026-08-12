import type { AgentGoalConfig } from '@n8n/api-types';

import type { GoalGraphDefinition, GoalStatuses, SlotValues } from './types';

const STEERING_PREAMBLE = [
	'This conversation is steered by a goal graph. Goal statuses are derived',
	'deterministically from the state slots below — you cannot set a status',
	'directly; statuses change only when slots change (via tool results or',
	'fill_slot). Work towards ACTIVE goals. LOCKED goals cannot be pursued yet:',
	'if the user asks for one, explain which goals must be achieved first.',
	'Stop pursuing FAILED goals. Tools attached to goals are only available',
	'while their goal is ACTIVE.',
].join(' ');

/**
 * Render the per-iteration system prompt suffix: an overview of every goal
 * with its live status, full instructions for active goals only, and the
 * current slot values.
 */
export function buildGoalGraphPrompt(
	definition: GoalGraphDefinition,
	state: SlotValues,
	statuses: GoalStatuses,
): string {
	const goalsById = new Map(definition.goals.map((goal) => [goal.id, goal]));

	const overview = definition.goals
		.map((goal) => {
			const status = statuses[goal.id] ?? 'locked';
			const requires = formatRequires(goal, goalsById, status);
			const summary = goal.summary ? ` — ${goal.summary}` : '';
			return `- [${status.toUpperCase()}] ${goal.name}${requires}${summary}`;
		})
		.join('\n');

	const activeGoals = definition.goals.filter((goal) => statuses[goal.id] === 'active');
	const activeInstructions = activeGoals
		.map((goal) => `### ${goal.name}\n${goal.instructions}`)
		.join('\n\n');

	// `private` slots are invisible to the model — never listed, even by name.
	const slotLines = definition.slots
		.filter((slot) => slot.access !== 'private')
		.map((slot) => {
			const value = state[slot.name];
			const rendered = value === null || value === undefined ? 'not filled' : JSON.stringify(value);
			const writer = slot.access === 'standard' ? 'fill via fill_slot' : 'set by tool results';
			const description = slot.description ? ` — ${slot.description}` : '';
			return `- ${slot.name} (${slot.type}, ${writer}): ${rendered}${description}`;
		})
		.join('\n');

	const sections = [
		STEERING_PREAMBLE,
		`Goals:\n${overview}`,
		activeInstructions ? `Instructions for active goals:\n\n${activeInstructions}` : undefined,
		slotLines ? `State slots:\n${slotLines}` : undefined,
	].filter((section): section is string => section !== undefined);

	return `<goal_graph>\n${sections.join('\n\n')}\n</goal_graph>`;
}

function formatRequires(
	goal: AgentGoalConfig,
	goalsById: Map<string, AgentGoalConfig>,
	status: string,
): string {
	if (status !== 'locked' || !goal.requires?.length) return '';
	const names = goal.requires.map((id) => goalsById.get(id)?.name ?? id);
	return ` (requires: ${names.join(', ')})`;
}
