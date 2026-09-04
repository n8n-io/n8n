// Remark plugin for the backend docs site. It does three things:
// 1. Drops the leading `#` heading. Starlight already renders the front matter title,
//    and GitHub needs the heading in the file, so the page would show it twice.
// 2. Turns ```mermaid fences into <pre class="mermaid"> so the browser renders them.
// 3. Rewrites relative links. A link to another page in docs/backend becomes a site
//    route. A link to anything else in the repository becomes a GitHub URL.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const DOCS_DIR = resolve(REPO_DIR, 'docs/backend');
const GITHUB_BASE = 'https://github.com/n8n-io/n8n/blob/master/';

const isRelative = (url) => !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(url);

const escapeHtml = (text) =>
	text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const toPosix = (path) => path.split('\\').join('/');

/** Maps a relative link in `fromDir` to a site route or a GitHub URL. */
export function rewriteLink(url, fromDir) {
	const [target, hash] = url.split('#');
	const suffix = hash ? `#${hash}` : '';
	const absolute = resolve(fromDir, target);
	const insideDocs = toPosix(relative(DOCS_DIR, absolute));
	if (!insideDocs.startsWith('..') && insideDocs.endsWith('.md')) {
		const route = insideDocs.slice(0, -3).replace(/(^|\/)README$/, '$1');
		return `/${route}${route ? '/' : ''}${suffix}`;
	}
	return `${GITHUB_BASE}${toPosix(relative(REPO_DIR, absolute))}${suffix}`;
}

function walk(node, visit, index, parent) {
	visit(node, index, parent);
	if (node.children) for (let i = 0; i < node.children.length; i++) walk(node.children[i], visit, i, node);
}

export function remarkBackendDocs() {
	return (tree, file) => {
		const filePath = file.path ?? file.history?.[0];
		const fromDir = filePath ? dirname(filePath) : DOCS_DIR;
		const first = tree.children[0];
		if (first?.type === 'heading' && first.depth === 1) tree.children.shift();
		walk(tree, (node, index, parent) => {
			if (node.type === 'code' && node.lang === 'mermaid' && parent) {
				parent.children[index] = {
					type: 'html',
					value: `<pre class="mermaid">${escapeHtml(node.value)}</pre>`,
				};
				return;
			}
			if ((node.type === 'link' || node.type === 'definition') && isRelative(node.url)) {
				node.url = rewriteLink(node.url, fromDir);
			}
		});
	};
}
