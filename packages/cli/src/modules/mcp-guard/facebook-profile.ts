import type { HttpVendorProfile } from './http-profiles';
import { looksLikeId } from './http-tool-caller';

// `/v23.0/<id>/feed`: the first segment after the version that looks like an id of Graph.
const GRAPH_OBJECT = /^\/(v[\d.]+)\/([^/?]+)/;
const MAX_LOOKUPS = 8;

const decodeSegment = (segment: string): string => {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
};

const graphObject = (path: string): { version: string; id: string } | undefined => {
	const named = GRAPH_OBJECT.exec(path);
	if (!named) return undefined;
	const id = decodeSegment(named[2]);
	// `me` is the user of the token. The gym has it, so only an id needs a copy.
	return looksLikeId(id) ? { version: named[1], id } : undefined;
};

export const FACEBOOKGRAPH_PROFILE: HttpVendorProfile = {
	name: 'facebookgraph',
	gymService: 'facebook',
	// The node sends the token in the query. The guard removes it, and the gym gets its own in a header.
	querySecrets: ['access_token', 'appsecret_proof', 'appsecret_time'],
	// The ids of Graph are long numbers. The gym keeps the real id when the seed names it.
	opaqueIds: true,
	credentialKind: 'access_token',
	credentialField: 'accessToken',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: 'person:me', name: 'Guard', email: 'guard@unknown.invalid' },
	},
	lookups: (tool, args) => {
		// A write on an object needs that object in the gym. A real read of the object gives its fields.
		if (!tool.startsWith('write_')) return [];
		const named = graphObject(String(args.path));
		if (!named) return [];
		return [
			{
				tool: 'read_get_object',
				args: { method: 'GET', path: `/${named.version}/${encodeURIComponent(named.id)}` },
			},
		].slice(0, MAX_LOOKUPS);
	},
	hydrateWrite: (args, gymIds) => {
		const named = graphObject(args.path);
		return named !== undefined && !gymIds.has(named.id);
	},
	hydrateRead: (args) => {
		// The permissions of a token and the debug of a token name nothing that an agent copies.
		return !/\/(?:permissions|debug_token)$/.test(args.path);
	},
};
