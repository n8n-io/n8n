import type { PluginSimple } from 'markdown-it';

const SKILL_FILE = 'SKILL.md';
const SKILL_FILE_LINK_PREFIX = '#skill-file=';
/** A link that points to no file of the skill. A click on it does nothing. */
const MISSING_FILE_LINK = '#skill-file-missing';

/** A link with a scheme, a link to the site root, and a link to an anchor are not file links. */
function isRelativeLink(href: string): boolean {
	return href !== '' && !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(href);
}

/**
 * The file of a skill that a relative Markdown link points to, or undefined when the link
 * points outside the skill or to no file. `fromPath` is the file that holds the link.
 */
export function resolveSkillFileLink(
	href: string,
	fromPath: string,
	paths: readonly string[],
): string | undefined {
	if (!isRelativeLink(href)) return undefined;
	let target: string;
	try {
		target = decodeURIComponent(href.split(/[?#]/)[0]);
	} catch {
		return undefined;
	}
	const segments = fromPath.split('/').slice(0, -1);
	for (const segment of target.split('/')) {
		if (segment === '' || segment === '.') continue;
		if (segment === '..') {
			if (segments.length === 0) return undefined;
			segments.pop();
		} else {
			segments.push(segment);
		}
	}
	const path = segments.join('/');
	return path === SKILL_FILE || paths.includes(path) ? path : undefined;
}

/**
 * Turns each relative link into a link that stays on the page. The Markdown sanitizer
 * removes a bare relative address, and the browser reads `./a.md` against the page address,
 * so without this a click opens another page of n8n.
 */
export function skillFileLinkPlugin(resolve: (href: string) => string | undefined): PluginSimple {
	return (md) => {
		md.core.ruler.push('skill_file_links', (state) => {
			for (const block of state.tokens) {
				for (const token of block.children ?? []) {
					if (token.type !== 'link_open') continue;
					const href = token.attrGet('href') ?? '';
					if (!isRelativeLink(href)) continue;
					const path = resolve(href);
					token.attrSet(
						'href',
						path === undefined
							? MISSING_FILE_LINK
							: `${SKILL_FILE_LINK_PREFIX}${encodeURIComponent(path)}`,
					);
				}
			}
		});
	};
}

/**
 * What a click on a link of the plugin does. `path` is set for a link to a file of the
 * skill. `handled` is true for each link of the plugin, so the caller stops the browser.
 */
export function readSkillFileLink(href: string | null): { handled: boolean; path?: string } {
	if (href === MISSING_FILE_LINK) return { handled: true };
	if (!href?.startsWith(SKILL_FILE_LINK_PREFIX)) return { handled: false };
	return { handled: true, path: decodeURIComponent(href.slice(SKILL_FILE_LINK_PREFIX.length)) };
}
