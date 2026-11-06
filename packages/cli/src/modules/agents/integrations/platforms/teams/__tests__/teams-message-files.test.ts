import { InboundAttachmentAccessError } from '../../../agent-chat-integration';
import {
	fetchTeamsMessageFiles,
	graphHttpOf,
	graphMessagePaths,
	type GraphHttp,
} from '../teams-message-files';

const TEAM = '1235c9a1-ef3a-4a0e-8529-0b40578bdabc';
const CHANNEL = '19:abc@thread.tacv2';
const GRAPH = 'https://graph.microsoft.com/v1.0';

function channelActivity(id: string, rootId: string) {
	return {
		id,
		conversation: { conversationType: 'channel', id: `${CHANNEL};messageid=${rootId}` },
		channelData: { team: { aadGroupId: TEAM }, channel: { id: CHANNEL } },
	};
}

const groupChatActivity = {
	id: '300',
	conversation: { conversationType: 'groupChat', id: '19:chat@thread.v2' },
};

const CHANNEL_PATH = `/teams/${TEAM}/channels/${encodeURIComponent(CHANNEL)}`;
const ROOT_PATH = `${CHANNEL_PATH}/messages/100`;

const CONTENT_URL = 'https://contoso.sharepoint.com/sites/team/Shared Documents/plan.pdf';
const SHARE_ID = `u!${Buffer.from(CONTENT_URL).toString('base64url')}`;
const FILE_BYTES = Buffer.from('file bytes');

const forbidden = () => Object.assign(new Error('403'), { response: { status: 403 } });

/** Answers Graph by URL prefix, so a test states only what differs. */
function graphRouting(routes: Record<string, unknown>) {
	const get = vi.fn<GraphHttp['get']>(async (url) => {
		const key = Object.keys(routes).find((prefix) => url.startsWith(`${GRAPH}${prefix}`));
		if (key === undefined) throw new Error(`unrouted ${url}`);
		const value = routes[key];
		if (value instanceof Error) throw value;
		return { data: value };
	});
	return { http: { get }, get };
}

const DRIVE_ROOT = '/drives/drive-1/root:';
const inDrive = (driveId: string, path: string) => ({ parentReference: { driveId, path } });

/** A message sharing one file, which lives in the files folder of channel `General`. */
function sharedFileRoutes(overrides: Record<string, unknown> = {}) {
	return {
		[ROOT_PATH]: {
			from: { user: { id: 'sender-1' } },
			attachments: [{ contentType: 'reference', contentUrl: CONTENT_URL, name: 'plan.pdf' }],
		},
		[`/shares/${SHARE_ID}/driveItem`]: {
			id: 'item-1',
			...inDrive('drive-1', `${DRIVE_ROOT}/General`),
		},
		[`${CHANNEL_PATH}/filesFolder`]: { name: 'General', ...inDrive('drive-1', DRIVE_ROOT) },
		'/drives/drive-1/items/item-1/content': FILE_BYTES,
		...overrides,
	};
}

describe('graphMessagePaths', () => {
	it('addresses a channel post that starts a thread, and the channel files', () => {
		expect(graphMessagePaths(channelActivity('100', '100'))).toEqual({
			message: ROOT_PATH,
			filesFolder: `${CHANNEL_PATH}/filesFolder`,
		});
	});

	it('addresses a reply under its thread root', () => {
		expect(graphMessagePaths(channelActivity('200', '100'))?.message).toBe(
			`${ROOT_PATH}/replies/200`,
		);
	});

	it('addresses a group chat message, which has no files folder', () => {
		expect(graphMessagePaths(groupChatActivity)).toEqual({
			message: `/chats/${encodeURIComponent('19:chat@thread.v2')}/messages/300`,
		});
	});

	it('skips a direct message, which carries its files itself', () => {
		expect(
			graphMessagePaths({ id: '1', conversation: { conversationType: 'personal', id: 'a:1' } }),
		).toBeUndefined();
	});
});

describe('fetchTeamsMessageFiles', () => {
	it('downloads a file from the channel files', async () => {
		const { http, get } = graphRouting(sharedFileRoutes());

		const [file] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		expect(file).toMatchObject({ type: 'file', name: 'plan.pdf', url: CONTENT_URL });
		expect(await file.fetchData?.()).toEqual(FILE_BYTES);
		expect(get).toHaveBeenLastCalledWith(
			`${GRAPH}/drives/drive-1/items/item-1/content`,
			expect.objectContaining({ responseType: 'arraybuffer' }),
		);
	});

	it('downloads a file from a folder inside the channel files', async () => {
		const { http } = graphRouting(
			sharedFileRoutes({
				[`/shares/${SHARE_ID}/driveItem`]: {
					id: 'item-1',
					...inDrive('drive-1', `${DRIVE_ROOT}/General/Specs%202026`),
				},
			}),
		);

		const [file] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		expect(await file.fetchData?.()).toEqual(FILE_BYTES);
	});

	it.each([
		['another channel', `${DRIVE_ROOT}/Marketing`],
		['a folder that only starts like the channel', `${DRIVE_ROOT}/General Archive`],
		['the library root', DRIVE_ROOT],
	])('refuses a file in %s of the same library', async (_, path) => {
		const { http, get } = graphRouting(
			sharedFileRoutes({
				[`/shares/${SHARE_ID}/driveItem`]: { id: 'item-1', ...inDrive('drive-1', path) },
				'/drives/drive-1?': { owner: { group: { id: TEAM } } },
			}),
		);

		const [file] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		await expect(file.fetchData?.()).rejects.toBeInstanceOf(InboundAttachmentAccessError);
		expect(get).not.toHaveBeenCalledWith(expect.stringContaining('/content'), expect.anything());
	});

	it("downloads a file from the sender's own drive", async () => {
		const { http } = graphRouting(
			sharedFileRoutes({
				[`${CHANNEL_PATH}/filesFolder`]: {
					name: 'General',
					...inDrive('team-drive', '/drives/team-drive/root:'),
				},
				'/drives/drive-1?': { owner: { user: { id: 'sender-1' } } },
			}),
		);

		const [file] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		expect(await file.fetchData?.()).toEqual(FILE_BYTES);
	});

	it('refuses a file that is neither in the conversation nor owned by the sender', async () => {
		const { http, get } = graphRouting(
			sharedFileRoutes({
				[`${CHANNEL_PATH}/filesFolder`]: {
					name: 'General',
					...inDrive('team-drive', '/drives/team-drive/root:'),
				},
				'/drives/drive-1?': { owner: { user: { id: 'someone-else' } } },
			}),
		);

		const [file] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		await expect(file.fetchData?.()).rejects.toBeInstanceOf(InboundAttachmentAccessError);
		expect(get).not.toHaveBeenCalledWith(expect.stringContaining('/content'), expect.anything());
	});

	it("checks the sender's drive in a group chat", async () => {
		const chatPath = `/chats/${encodeURIComponent('19:chat@thread.v2')}/messages/300`;
		const { [ROOT_PATH]: message, ...rest } = sharedFileRoutes({
			'/drives/drive-1?': { owner: { user: { id: 'sender-1' } } },
		});
		const { http } = graphRouting({ ...rest, [chatPath]: message });

		const [file] = await fetchTeamsMessageFiles(http, groupChatActivity);

		expect(await file.fetchData?.()).toEqual(FILE_BYTES);
	});

	it('asks for Files.Read.All when Graph refuses the file', async () => {
		const { http } = graphRouting(
			sharedFileRoutes({ [`/shares/${SHARE_ID}/driveItem`]: forbidden() }),
		);

		const [file] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		await expect(file.fetchData?.()).rejects.toThrow('Files.Read.All');
	});

	it('downloads a pasted image from the message hosted content', async () => {
		const src = `${GRAPH}${ROOT_PATH}/hostedContents/abc/$value`;
		const { http } = graphRouting({
			[`${ROOT_PATH}/hostedContents/`]: FILE_BYTES,
			[ROOT_PATH]: { body: { content: `<p>look</p><img alt="x" src="${src}">` } },
		});

		const [image] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		expect(image).toMatchObject({ type: 'image', url: src });
		expect(await image.fetchData?.()).toEqual(FILE_BYTES);
	});

	it('points a refused image to the app package, not to Files.Read.All', async () => {
		const src = `${GRAPH}${ROOT_PATH}/hostedContents/abc/$value`;
		const { http } = graphRouting({
			[`${ROOT_PATH}/hostedContents/`]: forbidden(),
			[ROOT_PATH]: { body: { content: `<img src="${src}">` } },
		});

		const [image] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		await expect(image.fetchData?.()).rejects.toThrow('latest package');
	});

	it('ignores an image outside Graph, so the token is never sent elsewhere', async () => {
		const { http } = graphRouting({
			[ROOT_PATH]: { body: { content: '<img src="https://example.com/hostedContents/x/$value">' } },
		});

		expect(await fetchTeamsMessageFiles(http, channelActivity('100', '100'))).toEqual([]);
	});

	it('reads an image whose address spells the channel id out, as Teams writes it', async () => {
		const src = `${GRAPH}/teams/${TEAM}/channels/${CHANNEL}/messages/100/hostedContents/abc/$value`;
		const { http } = graphRouting({ [ROOT_PATH]: { body: { content: `<img src="${src}">` } } });

		expect(await fetchTeamsMessageFiles(http, channelActivity('100', '100'))).toHaveLength(1);
	});

	it('ignores Graph content that is not hosted on this message', async () => {
		const elsewhere = [
			`${GRAPH}${CHANNEL_PATH}/messages/200/hostedContents/abc/$value`,
			`${GRAPH}/drives/d1/root:/hostedContents/plan.pdf:/content`,
		];
		const { http } = graphRouting({
			[ROOT_PATH]: {
				body: { content: elsewhere.map((src) => `<img src="${src}">`).join('') },
			},
		});

		expect(await fetchTeamsMessageFiles(http, channelActivity('100', '100'))).toEqual([]);
	});

	it('ignores attachments that are not files, such as cards', async () => {
		const { http } = graphRouting({
			[ROOT_PATH]: {
				attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: '{}' }],
			},
		});

		expect(await fetchTeamsMessageFiles(http, channelActivity('100', '100'))).toEqual([]);
	});

	it('points a refused message lookup to the app package', async () => {
		const { http } = graphRouting({ [ROOT_PATH]: forbidden() });

		await expect(fetchTeamsMessageFiles(http, channelActivity('100', '100'))).rejects.toThrow(
			'latest package',
		);
	});

	it('makes no Graph call for a direct message', async () => {
		const { http, get } = graphRouting({});

		await fetchTeamsMessageFiles(http, { id: '1', conversation: { conversationType: 'personal' } });

		expect(get).not.toHaveBeenCalled();
	});
});

describe('graphHttpOf', () => {
	it('finds the Graph client on the adapter', () => {
		const http = { get: vi.fn() };

		expect(graphHttpOf({ app: { graph: { http } } })).toBe(http);
	});

	it('returns nothing when the adapter has no Graph client', () => {
		expect(graphHttpOf({})).toBeUndefined();
	});
});
