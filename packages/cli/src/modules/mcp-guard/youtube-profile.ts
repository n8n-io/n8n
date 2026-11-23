import { isRecord } from '@n8n/utils/is-record';
import type { HttpVendorProfile } from './http-profiles';

const YOUTUBE_RESOURCE =
	/^\/(?:upload\/)?youtube\/v3\/(playlists|playlistItems|videos|channels)(?:\/|$)/;
// The parts that a copy of an object needs. A get costs 1 quota unit, with any parts.
const YOUTUBE_PARTS: Record<string, string> = {
	playlists: 'snippet,status,contentDetails',
	playlistItems: 'snippet,contentDetails,status',
	videos: 'snippet,status,contentDetails',
	channels: 'snippet,contentDetails,brandingSettings',
};
// A YouTube id is letters, digits, `-` and `_`. Anything else is not put in a real read.
const YOUTUBE_ID = /^[A-Za-z0-9_-]{1,64}$/;
// The real data that these lists give is the same in every account. The gym has its own copy.
const YOUTUBE_STATIC_LISTS = /\/(videoCategories|i18nLanguages)$/;
const YOUTUBE_OWNER = 'person:me';

const idIn = (value: unknown): string | undefined =>
	typeof value === 'string' && YOUTUBE_ID.test(value) ? value : undefined;

// The objects that a write names: the target (`id` in the body or the query) and, for a playlist item,
// the playlist and the video in its snippet. Each entry is [resource, id].
function youtubeNamed(args: Record<string, unknown>): Array<[string, string]> {
	const resource = YOUTUBE_RESOURCE.exec(String(args.path))?.[1];
	if (!resource) return [];
	const body = isRecord(args.body) ? args.body : {};
	const query = isRecord(args.query) ? args.query : {};
	const snippet = isRecord(body.snippet) ? body.snippet : {};
	const target = idIn(body.id) ?? idIn(query.id);
	const named: Array<[string, string | undefined]> = [
		[resource, target],
		['playlists', idIn(snippet.playlistId)],
		['videos', isRecord(snippet.resourceId) ? idIn(snippet.resourceId.videoId) : undefined],
	];
	return named.flatMap(([kind, id]) => (id === undefined ? [] : [[kind, id] as [string, string]]));
}

// The gym has one account. Code sets it as the owner, so a model cannot name a person that is missing.
export function withYoutubeOwner(overlay: Record<string, unknown>): Record<string, unknown> {
	const native = isRecord(overlay.native) ? overlay.native : undefined;
	const youtube = native && isRecord(native.google_youtube) ? native.google_youtube : undefined;
	if (!native || !youtube) return overlay;
	const own = (items: unknown) =>
		Array.isArray(items)
			? items.map((item) =>
					isRecord(item) ? { ...item, owner: YOUTUBE_OWNER, visibility: 'tenant' } : item,
				)
			: items;
	const owned = { ...youtube };
	for (const key of ['channels', 'videos', 'playlists']) {
		if (owned[key] !== undefined) owned[key] = own(owned[key]);
	}
	return { ...overlay, native: { ...native, google_youtube: owned } };
}

// Needs the gym of `google-wildcard` (service "youtube"). It shares www.googleapis.com with Gmail.
export const YOUTUBE_PROFILE: HttpVendorProfile = {
	name: 'youtube',
	opaqueIds: true,
	credentialKind: 'google_oauth',
	credentialField: 'oauthTokenData.access_token',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: YOUTUBE_OWNER, name: 'Guard', email: 'guard@unknown.invalid' },
	},
	finalize: withYoutubeOwner,
	lookups: (tool, args) => {
		// A write on an object needs that object in the gym. A get of one object costs 1 quota unit.
		if (!tool.startsWith('write_')) return [];
		return youtubeNamed(args).map(([resource, id]) => ({
			tool: `read_list_${resource}`,
			args: {
				method: 'GET',
				path: `/youtube/v3/${resource}`,
				query: { part: YOUTUBE_PARTS[resource], id },
			},
		}));
	},
	hydrateRead: (args) => !YOUTUBE_STATIC_LISTS.test(args.path),
	// An id that the gym made is not in the real service. Skip the real lookups of it.
	hydrateWrite: (args, gymIds) => youtubeNamed(args).some(([, id]) => !gymIds.has(id)),
};
