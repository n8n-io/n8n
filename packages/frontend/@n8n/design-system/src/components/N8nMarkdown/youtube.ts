import type MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline';

// Detects custom markdown tags in format "@[youtube](<video_id>)"
const YOUTUBE_TAG_REGEX = /@\[youtube]\(([\w-]{11}(?:\?.*)?)\)/im;

export const YOUTUBE_EMBED_SRC_REGEX =
	/^https:\/\/(?:www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]{11}(?:\?.*)?$/i;

export interface YoutubeEmbedConfig {
	width?: number | string;
	height?: number | string;
	title?: string;
	nocookie?: boolean;
}

export const markdownYoutubeEmbed = (md: MarkdownIt, options: YoutubeEmbedConfig) => {
	const opts = {
		width: '100%',
		title: 'YouTube video player',
		nocookie: true,
		...options,
	};

	const parser = (state: StateInline, silent: boolean): boolean => {
		const { pos, src } = state;

		// Must start with @
		if (src.charCodeAt(pos) !== 0x40 /* @ */) return false;

		const match = YOUTUBE_TAG_REGEX.exec(src.slice(pos));
		if (!match) return false;

		if (!silent) {
			const token = state.push('youtube_embed', '', 0);
			token.meta = { videoId: match[1] };
		}

		state.pos += match[0].length;
		return true;
	};

	const youtubeUrl = opts.nocookie
		? 'https://www.youtube-nocookie.com/embed/'
		: 'https://www.youtube.com/embed/';

	md.inline.ruler.before('link', 'youtube_embed', parser);
	md.renderer.rules.youtube_embed = (tokens: Token[], idx: number): string => {
		const { videoId } = tokens[idx].meta as { videoId: string };

		const parameters = [
			`width="${opts.width}"`,
			...(opts.height ? [`height="${opts.height}"`] : []),
			`src="${youtubeUrl}${videoId}"`,
			`title="${md.utils.escapeHtml(opts.title)}"`,
			'frameborder="0"',
			'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"',
			'referrerpolicy="strict-origin-when-cross-origin"',
			'allowfullscreen',
		];

		return `<iframe ${parameters.join(' ')}></iframe>`;
	};
};
