import MarkdownIt from 'markdown-it';

// `html: false` escapes raw HTML in the source, so agent output is safe to render.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

const renderLink = md.renderer.rules.link_open ?? md.renderer.renderToken.bind(md.renderer);
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
	tokens[idx].attrSet('target', '_blank');
	tokens[idx].attrSet('rel', 'noopener noreferrer');
	return renderLink(tokens, idx, options, env, self);
};

/** Markdown to sanitized HTML. `inline` skips the wrapping `<p>` for a single line. */
export function renderMarkdown(source: string, inline = false): string {
	return inline ? md.renderInline(source) : md.render(source);
}
