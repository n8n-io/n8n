/** Sunburst layout: turn -> model step -> tool call, sized by time or tokens. */
import type { ModelStep, Turn } from '../schema';

export type SunburstMode = 'time' | 'tokens';

export interface Arc {
	id: string;
	ring: 0 | 1 | 2;
	start: number;
	end: number;
	label: string;
	value: number;
	/** Tool name for tool arcs, else null. */
	tool: string | null;
	derived: boolean;
	focus: string;
}

interface Leaf {
	label: string;
	value: number;
	tool: string | null;
	derived: boolean;
	focus: string;
}

const tokensOf = (step: ModelStep) => (step.usage ? step.usage.input + step.usage.output : 0);

function leavesOf(step: ModelStep, mode: SunburstMode, turnFocus: string): Leaf[] {
	const calls = step.toolCalls;
	if (mode === 'time') {
		const window = step.toolWindowMs ?? 0;
		return [
			{
				label: 'model generation',
				value: step.modelMs,
				tool: null,
				derived: false,
				focus: calls[0]?.id ?? turnFocus,
			},
			...calls.map((call) => ({
				label: call.tool,
				value: window / calls.length,
				tool: call.tool,
				derived: true,
				focus: call.id,
			})),
		];
	}
	const tokens = tokensOf(step);
	if (calls.length === 0) {
		return [{ label: 'text answer', value: tokens, tool: null, derived: false, focus: turnFocus }];
	}
	return calls.map((call) => ({
		label: call.tool,
		value: tokens / calls.length,
		tool: call.tool,
		derived: true,
		focus: call.id,
	}));
}

export function sunburstArcs(turns: Turn[], mode: SunburstMode): Arc[] {
	const tree = turns.map((turn, turnIndex) => {
		const focus = `turn-${turnIndex}`;
		const steps = turn.steps.map((step, stepIndex) => {
			const leaves = leavesOf(step, mode, focus);
			return {
				stepIndex,
				leaves,
				value: leaves.reduce((sum, leaf) => sum + leaf.value, 0),
				focus: leaves[0]?.focus ?? focus,
			};
		});
		return { turnIndex, steps, value: steps.reduce((sum, step) => sum + step.value, 0), focus };
	});
	const total = tree.reduce((sum, turn) => sum + turn.value, 0);
	if (total <= 0) return [];
	const angle = (value: number) => (value / total) * Math.PI * 2;
	/** Places items one after the other from `from`, each as wide as its value. */
	const place = <T extends { value: number }>(items: T[], from: number) =>
		items.reduce<Array<{ item: T; start: number; end: number }>>((placed, item) => {
			const start = placed.at(-1)?.end ?? from;
			return [...placed, { item, start, end: start + angle(item.value) }];
		}, []);
	const arcs = place(tree, 0).flatMap(({ item: turn, start, end }): Arc[] => [
		{
			id: `turn-${turn.turnIndex}`,
			ring: 0,
			start,
			end,
			label: `turn ${turn.turnIndex + 1}`,
			value: turn.value,
			tool: null,
			derived: false,
			focus: turn.focus,
		},
		...place(turn.steps, start).flatMap(({ item: step, start: stepStart, end: stepEnd }): Arc[] => [
			{
				id: `step-${turn.turnIndex}-${step.stepIndex}`,
				ring: 1,
				start: stepStart,
				end: stepEnd,
				label: `turn ${turn.turnIndex + 1} · model step ${step.stepIndex + 1}`,
				value: step.value,
				tool: null,
				derived: false,
				focus: step.focus,
			},
			...place(step.leaves, stepStart).map(
				({ item: leaf, start: leafStart, end: leafEnd }, leafIndex): Arc => ({
					id: `leaf-${turn.turnIndex}-${step.stepIndex}-${leafIndex}`,
					ring: 2,
					start: leafStart,
					end: leafEnd,
					...leaf,
				}),
			),
		]),
	]);
	return arcs.filter((arc) => arc.end - arc.start > 0);
}

/** SVG path of a ring segment; angles in radians, clockwise from the top. */
export function arcPath(inner: number, outer: number, start: number, end: number): string {
	const sweep = Math.min(end - start, Math.PI * 2 - 1e-4);
	const stop = start + sweep;
	const point = (radius: number, angle: number) =>
		`${(radius * Math.sin(angle)).toFixed(4)} ${(-radius * Math.cos(angle)).toFixed(4)}`;
	const large = sweep > Math.PI ? 1 : 0;
	return [
		`M ${point(outer, start)}`,
		`A ${outer} ${outer} 0 ${large} 1 ${point(outer, stop)}`,
		`L ${point(inner, stop)}`,
		`A ${inner} ${inner} 0 ${large} 0 ${point(inner, start)}`,
		'Z',
	].join(' ');
}
