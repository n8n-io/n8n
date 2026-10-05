/** The selected tree node, kept in the URL hash so reload and back work. */
import { onBeforeUnmount, ref } from 'vue';

export type IterationTab =
	| 'transcript'
	| 'trace'
	| 'timeline'
	| 'sunburst'
	| 'tools'
	| 'scenarios'
	| 'workflow';

export const ITERATION_TABS: IterationTab[] = [
	'transcript',
	'trace',
	'timeline',
	'sunburst',
	'tools',
	'scenarios',
	'workflow',
];

export type Selection =
	| { kind: 'summary' }
	| { kind: 'case'; caseName: string }
	| { kind: 'iteration'; id: string; tab: IterationTab }
	| { kind: 'scenario'; id: string; scenario: number };

const isTab = (value: string | undefined): value is IterationTab =>
	ITERATION_TABS.some((tab) => tab === value);

export function parseHash(hash: string): Selection {
	const [kind, first, second] = hash
		.replace(/^#\/?/, '')
		.split('/')
		.map((part) => decodeURIComponent(part));
	if (kind === 'case' && first) return { kind: 'case', caseName: first };
	if (kind === 'iteration' && first) {
		return { kind: 'iteration', id: first, tab: isTab(second) ? second : 'transcript' };
	}
	if (kind === 'scenario' && first) {
		return { kind: 'scenario', id: first, scenario: Number(second ?? 0) || 0 };
	}
	return { kind: 'summary' };
}

export function toHash(selection: Selection): string {
	const parts =
		selection.kind === 'case'
			? ['case', selection.caseName]
			: selection.kind === 'iteration'
				? ['iteration', selection.id, selection.tab]
				: selection.kind === 'scenario'
					? ['scenario', selection.id, String(selection.scenario)]
					: [];
	return `#/${parts.map((part) => encodeURIComponent(part)).join('/')}`;
}

export function useSelection() {
	const selection = ref<Selection>(parseHash(window.location.hash));
	const onHashChange = () => {
		selection.value = parseHash(window.location.hash);
	};
	window.addEventListener('hashchange', onHashChange);
	onBeforeUnmount(() => window.removeEventListener('hashchange', onHashChange));
	const select = (next: Selection) => {
		window.location.hash = toHash(next);
	};
	return { selection, select };
}
