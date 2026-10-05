/** Series colours from the design-system palette. SVG uses the variables; canvas charts need values. */
import { computed, inject, type ComputedRef, type InjectionKey } from 'vue';
const ARM_COLORS = [
	'--color--blue-500',
	'--color--orange-500',
	'--color--green-600',
	'--color--purple-500',
];
const SERIES_COLORS = [
	'--color--blue-500',
	'--color--orange-500',
	'--color--green-600',
	'--color--purple-500',
	'--color--pink-500',
	'--color--mint-600',
	'--color--yellow-600',
	'--color--red-500',
	'--color--blue-300',
	'--color--orange-300',
	'--color--purple-300',
	'--color--green-300',
	'--color--neutral-400',
];

export const armColorVar = (arm: number) => ARM_COLORS[arm % ARM_COLORS.length];

/** A stable colour per series name, from the order of first use. */
export function seriesColorVar(name: string, names: string[]): string {
	const at = names.indexOf(name);
	return SERIES_COLORS[(at < 0 ? 0 : at) % SERIES_COLORS.length];
}

export function cssColor(variable: string): string {
	return getComputedStyle(document.body).getPropertyValue(variable).trim() || 'gray';
}

/** All tool names of the loaded runs, so a tool keeps its colour in every chart. */
export const ToolNamesKey: InjectionKey<ComputedRef<string[]>> = Symbol('ToolNames');

export function useToolColor() {
	const names = inject(
		ToolNamesKey,
		computed(() => []),
	);
	return (tool: string) => seriesColorVar(tool, names.value);
}
