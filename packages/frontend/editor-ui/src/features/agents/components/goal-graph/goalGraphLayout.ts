import type { AgentGoalConfig } from '@n8n/api-types';

/**
 * Deterministic left-to-right layered layout for the read-only goal-graph
 * canvas. Pure function — no DOM, no deps. Goals are placed in columns by
 * dependency depth (longest path over `requires`, cycle-safe); the trigger
 * sits in a virtual column 0. Tool pills are positioned by the component
 * below their goal, so this only lays out goal + trigger node centres.
 */

// Geometry (px) — shared with AgentGoalGraphCanvas.vue so positions line up.
export const GOAL_SIZE = 96;
export const TRIGGER_SIZE = 96;
export const TOOL_SIZE = 60;
export const COL_GAP = 300;
export const ROW_GAP = 300;
export const MARGIN = 96;
/**
 * Extra empty space on the right so the rightmost nodes can be scrolled out
 * from under the floating RUN STATE panel (≈ panel width + gap).
 */
export const RIGHT_GUTTER = 300;
/** Goal-centre → first tool-pill-centre vertical distance. */
export const TOOL_OFFSET_Y = 150;
/** Horizontal spacing between sibling tool pills under one goal. */
export const TOOL_GAP_X = 110;

export interface Point {
	x: number;
	y: number;
}

export interface GoalGraphLayout {
	/** Node centres keyed by goal id. */
	goals: Record<string, Point>;
	/** Trigger node centre. */
	trigger: Point;
	/** Goal ids with no prerequisites (the trigger connects to these). */
	roots: string[];
	width: number;
	height: number;
}

/** Longest-path depth of each goal over `requires`, cycle-safe (back-edges → 0). */
function computeDepths(goals: AgentGoalConfig[]): Map<string, number> {
	const byId = new Map(goals.map((g) => [g.id, g]));
	const depth = new Map<string, number>();
	const inStack = new Set<string>();

	const visit = (id: string): number => {
		const cached = depth.get(id);
		if (cached !== undefined) return cached;
		if (inStack.has(id)) return 0; // cycle guard — treat back-edge as no depth
		inStack.add(id);
		const goal = byId.get(id);
		const requires = (goal?.requires ?? []).filter((r) => byId.has(r));
		const d = requires.length === 0 ? 0 : 1 + Math.max(...requires.map(visit));
		inStack.delete(id);
		depth.set(id, d);
		return d;
	};

	for (const g of goals) visit(g.id);
	return depth;
}

export function computeGoalGraphLayout(goals: AgentGoalConfig[]): GoalGraphLayout {
	const depths = computeDepths(goals);

	// Bucket goals into columns (col = depth + 1; col 0 is the trigger),
	// preserving input order within a column for stable, deterministic output.
	const columns = new Map<number, string[]>();
	let maxDepth = 0;
	for (const goal of goals) {
		const col = (depths.get(goal.id) ?? 0) + 1;
		maxDepth = Math.max(maxDepth, col);
		const bucket = columns.get(col) ?? [];
		bucket.push(goal.id);
		columns.set(col, bucket);
	}

	const tallest = Math.max(1, ...[...columns.values()].map((b) => b.length));
	const height = MARGIN * 2 + (tallest - 1) * ROW_GAP + GOAL_SIZE + TOOL_OFFSET_Y + TOOL_SIZE;
	const width = MARGIN * 2 + maxDepth * COL_GAP + GOAL_SIZE + RIGHT_GUTTER;
	const centreY = MARGIN + GOAL_SIZE / 2 + ((tallest - 1) * ROW_GAP) / 2;
	const colX = (col: number) => MARGIN + GOAL_SIZE / 2 + col * COL_GAP;

	const goalPositions: Record<string, Point> = {};
	for (const [col, ids] of columns) {
		ids.forEach((id, i) => {
			const y = centreY + (i - (ids.length - 1) / 2) * ROW_GAP;
			goalPositions[id] = { x: colX(col), y };
		});
	}

	const roots = goals
		.filter((g) => (g.requires ?? []).filter((r) => goalPositions[r]).length === 0)
		.map((g) => g.id);

	return {
		goals: goalPositions,
		trigger: { x: colX(0), y: centreY },
		roots,
		width,
		height,
	};
}
