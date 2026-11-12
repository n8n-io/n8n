// Remark plugin for the backend docs site. It does four things:
// 1. Drops the leading `#` heading. Starlight already renders the front matter title,
//    and GitHub needs the heading in the file, so the page would show it twice.
// 2. Turns ```mermaid fences into <pre class="mermaid"> so the browser renders them.
// 3. Rewrites relative links. A link to another page in docs/backend becomes a site
//    route. A link to anything else in the repository becomes a GitHub URL.
// 4. Counts the words of the page and stores the count and the reading time in the
//    front matter, so that the page title can show them.
// 5. Adds a line break point after each `/` in inline code, so that a long path wraps
//    between folders and not in the middle of a name.
// 6. Turns a multiple choice self-check into a quiz. See `buildQuizzes` for the format.
// 7. Turns a GitHub alert, such as `> [!NOTE]`, into an aside. GitHub renders the same syntax.
// 8. Shows an ordered list after a `<!-- steps -->` comment as numbered steps.
// 9. Shows a `<!-- contact: <login> -->` comment below a heading as the contact for that topic.
import { existsSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contactFor } from '../src/lib/contacts.ts';

const REPO_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const DOCS_DIR = resolve(REPO_DIR, 'docs/backend');
const GITHUB_BASE = 'https://github.com/n8n-io/n8n';

const isRelative = (url) => !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(url);

const escapeHtml = (text) =>
	text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const WORDS_PER_MINUTE = 200;

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
	const kind = existsSync(absolute) && statSync(absolute).isDirectory() ? 'tree' : 'blob';
	return `${GITHUB_BASE}/${kind}/master/${toPosix(relative(REPO_DIR, absolute))}${suffix}`;
}

function walk(node, visit, index, parent) {
	visit(node, index, parent);
	if (node.children) for (let i = 0; i < node.children.length; i++) walk(node.children[i], visit, i, node);
}

const OPTION = /^([A-Z])\.\s+/;
const ANSWER = /^([A-Z])\.\s+/;

const firstText = (node) => {
	const paragraph = node.children?.[0];
	const text = paragraph?.children?.[0];
	return text?.type === 'text' ? text : undefined;
};

const stripPrefix = (node, pattern) => {
	const text = firstText(node);
	if (text) text.value = text.value.replace(pattern, '');
};

/**
 * A quiz in Markdown is an ordered list of questions. Each question has a nested list of
 * options that start with a letter, such as "A. ". The next block is a `<details>` block
 * with an ordered list of answers. Each answer starts with the letter of the right option
 * and explains it. On GitHub this reads as a list with a closed answer block. On the site
 * the options become buttons, and the answer block moves into the questions.
 */
function buildQuizzes(tree) {
	walk(tree, (node) => {
		if (!node.children) return;
		const children = node.children;
		for (let i = 0; i < children.length; i++) {
			const questions = children[i];
			if (questions.type !== 'list' || !questions.ordered) continue;
			const isQuiz = questions.children.every((item) => {
				const options = item.children.find((child) => child.type === 'list');
				return options?.children.every((option) => OPTION.test(firstText(option)?.value ?? ''));
			});
			if (!isQuiz) continue;
			const open = children[i + 1];
			const answers = children[i + 2];
			const close = children[i + 3];
			if (
				open?.type !== 'html' ||
				!open.value.includes('<details') ||
				answers?.type !== 'list' ||
				close?.type !== 'html' ||
				!close.value.includes('</details>') ||
				answers.children.length !== questions.children.length ||
				!answers.children.every((answer) => ANSWER.test(firstText(answer)?.value ?? ''))
			) {
				continue;
			}
			questions.data = { hProperties: { className: ['quiz'] } };
			questions.children.forEach((question, q) => {
				const answer = answers.children[q];
				const letter = firstText(answer).value.match(ANSWER)[1];
				stripPrefix(answer, ANSWER);
				question.data = { hProperties: { className: ['quiz-question'], dataAnswer: letter } };
				const options = question.children.find((child) => child.type === 'list');
				options.data = { hProperties: { className: ['quiz-options'] } };
				for (const option of options.children) {
					const optionLetter = firstText(option).value.match(OPTION)[1];
					stripPrefix(option, OPTION);
					option.data = { hProperties: { dataLetter: optionLetter } };
				}
				question.children.push({
					type: 'quizExplanation',
					data: { hName: 'div', hProperties: { className: ['quiz-explanation'], hidden: true } },
					children: answer.children,
				});
			});
			children.splice(i + 1, 3);
		}
	});
}

const ICON_PATHS = {
	note: '<circle cx="8" cy="8" r="6.25" /><path d="M8 7.25v3.75M8 5h.01" />',
	tip: '<path d="M6 12.5h4M6.5 14.5h3M8 1.75a4.25 4.25 0 0 0-2.5 7.7c.4.3.75.8.75 1.3v.25h3.5v-.25c0-.5.35-1 .75-1.3A4.25 4.25 0 0 0 8 1.75Z" />',
	caution:
		'<path d="M7.1 2.5 1.6 12a1 1 0 0 0 .9 1.5h11a1 1 0 0 0 .9-1.5L8.9 2.5a1 1 0 0 0-1.8 0Z" /><path d="M8 6.25v3M8 11.25h.01" />',
};

// GitHub has five alert types. The site shows three styles.
const ALERT_KINDS = { NOTE: 'note', IMPORTANT: 'note', TIP: 'tip', WARNING: 'caution', CAUTION: 'caution' };
const ALERT = /^\[!(NOTE|IMPORTANT|TIP|WARNING|CAUTION)\]\s*/;

function buildAsides(tree) {
	walk(tree, (node, index, parent) => {
		if (node.type !== 'blockquote' || !parent) return;
		const text = node.children[0]?.children?.[0];
		const match = text?.type === 'text' ? text.value.match(ALERT) : null;
		if (!match) return;
		const kind = ALERT_KINDS[match[1]];
		text.value = text.value.replace(ALERT, '');
		if (!text.value) node.children[0].children.shift();
		if (node.children[0].children[0]?.type === 'break') node.children[0].children.shift();
		parent.children[index] = {
			type: 'aside',
			data: { hName: 'aside', hProperties: { className: ['n8n-aside', `n8n-aside--${kind}`] } },
			children: [
				{
					type: 'html',
					value: `<svg class="n8n-aside__icon" viewBox="0 0 16 16" aria-hidden="true">${ICON_PATHS[kind]}</svg>`,
				},
				{
					type: 'asideContent',
					data: { hName: 'div', hProperties: { className: ['n8n-aside__content'] } },
					children: node.children,
				},
			],
		};
	});
}

function buildSteps(tree) {
	walk(tree, (node) => {
		const children = node.children;
		if (!children) return;
		for (let i = 0; i < children.length - 1; i++) {
			const marker = children[i];
			const list = children[i + 1];
			if (marker.type !== 'html' || marker.value.trim() !== '<!-- steps -->') continue;
			if (list.type !== 'list' || !list.ordered) continue;
			list.data = { hProperties: { className: ['n8n-steps'] } };
			// A step that starts with a bold-only paragraph shows that paragraph as its title.
			for (const item of list.children) {
				const lead = item.children[0];
				if (lead?.type === 'paragraph' && lead.children.length === 1 && lead.children[0].type === 'strong') {
					lead.data = { hProperties: { className: ['n8n-step-title'] } };
				}
			}
			children.splice(i, 1);
		}
	});
}

const TOPIC_CONTACT = /^<!--\s*contact:\s*(\S+)\s*-->$/;

/** A topic that another team owns names its own contact, below its heading. */
function buildTopicContacts(tree, filePath) {
	walk(tree, (node, index, parent) => {
		const match = node.type === 'html' ? node.value.trim().match(TOPIC_CONTACT) : null;
		if (!match || !parent) return;
		if (parent.children[index - 1]?.type !== 'heading') {
			throw new Error(`${filePath}: put "${node.value.trim()}" directly below a heading.`);
		}
		const contact = contactFor(match[1]);
		const label = `For questions on this topic, ask ${escapeHtml(contact.name)}`;
		parent.children[index] = {
			type: 'html',
			value:
				`<p class="topic-contact"><a href="${contact.url}" title="${label}">` +
				`<img src="${contact.avatar}" width="16" height="16" alt="" loading="lazy" />` +
				`<span><span class="sr-only">For questions on this topic, ask </span>${escapeHtml(contact.name)}</span>` +
				'</a></p>',
		};
	});
}

export function remarkBackendDocs() {
	return (tree, file) => {
		const filePath = file.path ?? file.history?.[0];
		const fromDir = filePath ? dirname(filePath) : DOCS_DIR;
		let words = 0;
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
			// Count prose and inline code. Code blocks and diagrams are scanned, not read.
			if (node.type === 'text' || node.type === 'inlineCode') {
				words += node.value.split(/\s+/).filter(Boolean).length;
			}
			if (node.type === 'inlineCode' && node.value.includes('/') && parent) {
				parent.children[index] = {
					type: 'html',
					value: `<code>${escapeHtml(node.value).replaceAll('/', '/<wbr>')}</code>`,
				};
				return;
			}
			if ((node.type === 'link' || node.type === 'definition') && isRelative(node.url)) {
				node.url = rewriteLink(node.url, fromDir);
			}
		});
		buildQuizzes(tree);
		buildAsides(tree);
		buildSteps(tree);
		buildTopicContacts(tree, filePath);
		const frontmatter = file.data.astro?.frontmatter;
		if (frontmatter) {
			frontmatter.words = words;
			frontmatter.minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
		}
	};
}
