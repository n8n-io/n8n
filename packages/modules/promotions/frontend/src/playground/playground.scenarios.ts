/** Development only. The scenarios of the Environments Playground. */
export const PLAYGROUND_GROUPS = ['promote', 'apply', 'review'] as const;
export type PlaygroundGroup = (typeof PLAYGROUND_GROUPS)[number];

/** How many dependencies a scenario holds, so a design can be checked at each amount. */
export const PLAYGROUND_SIZES = ['few', 'some', 'many'] as const;
export type PlaygroundSize = (typeof PLAYGROUND_SIZES)[number];

export const PLAYGROUND_SCENARIO_IDS = [
	'p1',
	'p2',
	'p3',
	'p4',
	'p5',
	'a1',
	'a2',
	'a3',
	'a4',
	'b1',
] as const;
export type PlaygroundScenarioId = (typeof PLAYGROUND_SCENARIO_IDS)[number];

export interface PlaygroundScenario {
	id: PlaygroundScenarioId;
	group: PlaygroundGroup;
}

export const PLAYGROUND_SCENARIOS: readonly PlaygroundScenario[] = [
	{ id: 'p1', group: 'promote' },
	{ id: 'p2', group: 'promote' },
	{ id: 'p3', group: 'promote' },
	{ id: 'p4', group: 'promote' },
	{ id: 'p5', group: 'promote' },
	{ id: 'a1', group: 'apply' },
	{ id: 'a2', group: 'apply' },
	{ id: 'a3', group: 'apply' },
	{ id: 'a4', group: 'apply' },
	{ id: 'b1', group: 'review' },
];

export const DEFAULT_PLAYGROUND_SCENARIO: PlaygroundScenarioId = 'a4';
export const DEFAULT_PLAYGROUND_SIZE: PlaygroundSize = 'some';

export function isPlaygroundScenarioId(value: unknown): value is PlaygroundScenarioId {
	return PLAYGROUND_SCENARIO_IDS.some((id) => id === value);
}

export function isPlaygroundSize(value: unknown): value is PlaygroundSize {
	return PLAYGROUND_SIZES.some((size) => size === value);
}
