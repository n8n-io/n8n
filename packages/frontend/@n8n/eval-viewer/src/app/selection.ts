/** The selected page, kept in the URL hash so reload, back and shared links work. */
import { onBeforeUnmount, ref } from 'vue';

export type CompareTab = 'trace' | 'outcome' | 'transcript' | 'workflow';

export const COMPARE_TABS: CompareTab[] = ['trace', 'outcome', 'transcript', 'workflow'];

/** A case page compares two attempts. Unset ids fall back to the typical attempts. */
export interface CaseSelection {
	kind: 'case';
	caseName: string;
	left?: string;
	right?: string;
	tab?: CompareTab;
}

export type Selection = { kind: 'summary' } | CaseSelection;

const isTab = (value: string | undefined): value is CompareTab =>
	COMPARE_TABS.some((tab) => tab === value);

export function parseHash(hash: string): Selection {
	const [kind, caseName, left, right, tab] = hash
		.replace(/^#\/?/, '')
		.split('/')
		.map((part) => decodeURIComponent(part));
	if (kind !== 'case' || !caseName) return { kind: 'summary' };
	return {
		kind: 'case',
		caseName,
		left: left || undefined,
		right: right || undefined,
		tab: isTab(tab) ? tab : undefined,
	};
}

export function toHash(selection: Selection): string {
	const parts =
		selection.kind === 'case'
			? [
					'case',
					selection.caseName,
					...(selection.left || selection.right || selection.tab
						? [selection.left ?? '', selection.right ?? '', selection.tab ?? '']
						: []),
				]
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
