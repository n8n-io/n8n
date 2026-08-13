import type MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline';

import { serializeAttr } from '../../utils/markdown';

// Detects custom markdown tags in format "@[youtube](<video_id>)"
const YOUTUBE_TAG_REGEX = /@\[youtube]\(([A-Za-z0-9_-]{11})\)/im;

export const YOUTUBE_EMBED_SRC_REGEX =
	/^https:\/\/(?:www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/([A-Za-z0-9_-]{11})$/i;

const EMBED_FRAME_PERMISSIONS = [
	'accelerometer',
	'autoplay',
	'clipboard-write',
	'encrypted-media',
	'gyroscope',
	'picture-in-picture',
	'web-share',
	'fullscreen',
] as const;

const YOUTUBE_NOCOOKIE_URL = 'https://www.youtube-nocookie.com/embed/';
const YOUTUBE_STANDARD_URL = 'https://www.youtube.com/embed/';

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

	const youtubeUrl = opts.nocookie ? YOUTUBE_NOCOOKIE_URL : YOUTUBE_STANDARD_URL;

	md.inline.ruler.before('link', 'youtube_embed', parser);
	md.renderer.rules.youtube_embed = (tokens: Token[], idx: number): string => {
		const { videoId } = tokens[idx].meta as { videoId: string };

		const parameters = [
			serializeAttr('iframe', 'width', `${opts.width}`),
			...(opts.height ? [serializeAttr('iframe', 'height', `${opts.height}`)] : []),
			serializeAttr('iframe', 'src', `${youtubeUrl}${videoId}`),
			serializeAttr('iframe', 'title', md.utils.escapeHtml(opts.title)),
			serializeAttr('iframe', 'frameborder', '0'),
			serializeAttr('iframe', 'allow', EMBED_FRAME_PERMISSIONS.join('; ')),
			serializeAttr('iframe', 'referrerpolicy', 'strict-origin-when-cross-origin'),
		];

		return `<iframe ${parameters.join(' ')}></iframe>`;
	};
};
