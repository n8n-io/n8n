import MarkdownIt from 'markdown-it';

// Agent output is untrusted (prompt injection): no raw HTML, and no images, so a
// reply cannot load a URL that carries data out. Links open in a new tab.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true }).disable('image');
const defaultLink =
	md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
	tokens[idx].attrSet('target', '_blank');
	tokens[idx].attrSet('rel', 'noopener noreferrer');
	return defaultLink(tokens, idx, options, env, self);
};

export const renderMarkdown = (text: string) => md.render(text);
