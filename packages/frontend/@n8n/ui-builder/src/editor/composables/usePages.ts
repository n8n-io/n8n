import { computed, ref, watch } from 'vue';
import type { Ref } from 'vue';

import { createNode, findNode, insertRelativeTo, removeNode } from '../../core/document';
import { findPagedNode, normalisePath, pageInfos } from '../../core/pages';
import { DEFAULT_REGION } from '../../core/types';
import type { UiNode } from '../../core/types';

/**
 * The pages of the document, and the one being edited.
 *
 * A document is a single page until it holds a shell; from then on the shell's
 * content region holds pages and the canvas shows one of them. Which one is the
 * editor's own question, so it lives here rather than in the document.
 */
export function usePages(
	doc: Ref<UiNode>,
	commit: () => void,
	selectedId: Ref<string | undefined>,
	readOnly: Ref<boolean>,
) {
	const shell = computed(() => findPagedNode(doc.value));
	const pages = computed(() => (shell.value ? pageInfos(shell.value) : []));
	const editingPageId = ref<string | undefined>();
	const renamingId = ref<string | undefined>();

	const defaultPage = computed(() => {
		const path = normalisePath(String(shell.value?.props.defaultPage ?? ''));
		return pages.value.find((page) => page.path === path) ?? pages.value[0];
	});

	const editingPage = computed(
		() => pages.value.find((page) => page.id === editingPageId.value) ?? defaultPage.value,
	);

	// A page can go while it is being edited, from an undo or from another editor.
	watch(pages, (list) => {
		if (editingPageId.value && !list.some((page) => page.id === editingPageId.value)) {
			editingPageId.value = undefined;
		}
	});

	/** A path from a title: `Order history` gives `/order-history`, and `/` for the first page. */
	function pathFromTitle(title: string, isFirst: boolean): string {
		if (isFirst) return '/';

		const slug = title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');

		const base = normalisePath(slug || 'page');
		if (!pages.value.some((page) => page.path === base)) return base;

		let n = 2;
		while (pages.value.some((page) => page.path === `${base}-${n}`)) n++;
		return `${base}-${n}`;
	}

	/**
	 * Turns a single-page document into a shell holding it.
	 *
	 * The existing root becomes the first page rather than being thrown away, so
	 * enabling pages never costs an author what they had composed.
	 */
	function enablePages() {
		if (shell.value || readOnly.value) return;

		const root = doc.value;
		const shellNode = createNode('shell', root);

		// A root that is already a page becomes the first page. Anything else gets
		// a page wrapped around it first, so the shell always ends up holding one
		// and nothing composed is lost either way.
		let first = root;

		if (root.type !== 'page') {
			first = createNode('page', root);
			first.tree[DEFAULT_REGION] = [root];
		}

		first.props.path = normalisePath(String(first.props.path ?? '/'));
		first.props.title = String(first.props.title ?? '') || 'Home';

		shellNode.tree[DEFAULT_REGION] = [first];
		shellNode.props.defaultPage = first.props.path;
		doc.value = shellNode;

		editingPageId.value = first.id;
		commit();
	}

	function addPage() {
		if (readOnly.value) return;

		if (!shell.value) {
			enablePages();
			return;
		}

		const node = createNode('page', doc.value);
		const isFirst = pages.value.length === 0;

		node.props.title = isFirst ? 'Home' : `Page ${pages.value.length + 1}`;
		node.props.path = pathFromTitle(String(node.props.title), isFirst);

		insertRelativeTo(doc.value, { id: shell.value.id, region: DEFAULT_REGION }, node);

		// The first page is the default by default: an app with one page and no
		// default set would warn at runtime for no reason.
		if (isFirst) shell.value.props.defaultPage = node.props.path;

		editingPageId.value = node.id;
		selectedId.value = node.id;
		commit();
	}

	function removePage(id: string) {
		if (readOnly.value) return;

		const going = pages.value.find((page) => page.id === id);
		if (!going || !removeNode(doc.value, id)) return;

		// The default cannot point at a page that is gone, and neither can the
		// canvas: both fall to whatever is left.
		if (shell.value && normalisePath(String(shell.value.props.defaultPage ?? '')) === going.path) {
			shell.value.props.defaultPage = pages.value.find((page) => page.id !== id)?.path ?? '';
		}

		if (editingPageId.value === id) editingPageId.value = undefined;
		if (selectedId.value === id) selectedId.value = undefined;

		commit();
	}

	function makeDefault(id: string) {
		const page = pages.value.find((entry) => entry.id === id);
		if (!page || !shell.value || readOnly.value) return;

		shell.value.props.defaultPage = page.path;
		commit();
	}

	/**
	 * Only the title. A path is what other pages navigate to, so renaming one
	 * silently would break them.
	 */
	function renamePage(id: string, title: string) {
		const node = findNode(doc.value, id);
		if (!node || readOnly.value) return;

		node.props.title = title;
		commit();
	}

	function selectPage(id: string) {
		editingPageId.value = id;
		selectedId.value = id;
	}

	return {
		shell,
		pages,
		editingPageId,
		editingPage,
		defaultPage,
		renamingId,
		addPage,
		removePage,
		makeDefault,
		renamePage,
		selectPage,
	};
}
