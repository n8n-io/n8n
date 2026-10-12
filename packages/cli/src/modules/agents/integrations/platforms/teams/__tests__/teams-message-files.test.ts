import { InboundAttachmentAccessError } from '../../../agent-chat-integration';
import {
	fetchTeamsMessageFiles,
	graphHttpOf,
	graphMessagePath,
	type GraphHttp,
} from '../teams-message-files';

const TEAM = '1235c9a1-ef3a-4a0e-8529-0b40578bdabc';
const CHANNEL = '19:abc@thread.tacv2';

function channelActivity(id: string, rootId: string) {
	return {
		id,
		conversation: { conversationType: 'channel', id: `${CHANNEL};messageid=${rootId}` },
		channelData: { team: { aadGroupId: TEAM }, channel: { id: CHANNEL } },
	};
}

const ROOT_PATH = `/teams/${TEAM}/channels/${encodeURIComponent(CHANNEL)}/messages/100`;

function graphReturning(message: unknown) {
	const get = vi.fn<GraphHttp['get']>(async (url) =>
		url.startsWith('https://graph.microsoft.com/v1.0/teams/') ||
		url.startsWith('https://graph.microsoft.com/v1.0/chats/')
			? { data: message }
			: { data: Buffer.from('file bytes') },
	);
	return { http: { get }, get };
}

describe('graphMessagePath', () => {
	it('addresses a channel post that starts a thread', () => {
		expect(graphMessagePath(channelActivity('100', '100'))).toBe(ROOT_PATH);
	});

	it('addresses a reply under its thread root', () => {
		expect(graphMessagePath(channelActivity('200', '100'))).toBe(`${ROOT_PATH}/replies/200`);
	});

	it('addresses a group chat message', () => {
		expect(
			graphMessagePath({
				id: '300',
				conversation: { conversationType: 'groupChat', id: '19:chat@thread.v2' },
			}),
		).toBe(`/chats/${encodeURIComponent('19:chat@thread.v2')}/messages/300`);
	});

	it('skips a direct message, which carries its files itself', () => {
		expect(
			graphMessagePath({ id: '1', conversation: { conversationType: 'personal', id: 'a:1' } }),
		).toBeUndefined();
	});
});

describe('fetchTeamsMessageFiles', () => {
	it('downloads a shared file through its Graph share id', async () => {
		const contentUrl = 'https://contoso.sharepoint.com/sites/team/Shared Documents/plan.pdf';
		const { http, get } = graphReturning({
			attachments: [{ contentType: 'reference', contentUrl, name: 'plan.pdf' }],
		});

		const [file] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		expect(file).toMatchObject({ type: 'file', name: 'plan.pdf', url: contentUrl });
		expect(await file.fetchData?.()).toEqual(Buffer.from('file bytes'));
		const shareId = `u!${Buffer.from(contentUrl).toString('base64url')}`;
		expect(get).toHaveBeenLastCalledWith(
			`https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem/content`,
			expect.objectContaining({ responseType: 'arraybuffer' }),
		);
	});

	it('downloads a pasted image from the message hosted content', async () => {
		const src = `https://graph.microsoft.com/v1.0${ROOT_PATH}/hostedContents/abc/$value`;
		const { http } = graphReturning({ body: { content: `<p>look</p><img alt="x" src="${src}">` } });

		const files = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));

		expect(files).toEqual([expect.objectContaining({ type: 'image', url: src })]);
	});

	it('ignores an image outside Graph, so the token is never sent elsewhere', async () => {
		const { http } = graphReturning({
			body: { content: '<img src="https://example.com/hostedContents/x/$value">' },
		});

		expect(await fetchTeamsMessageFiles(http, channelActivity('100', '100'))).toEqual([]);
	});

	it('ignores attachments that are not files, such as cards', async () => {
		const { http } = graphReturning({
			attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: '{}' }],
		});

		expect(await fetchTeamsMessageFiles(http, channelActivity('100', '100'))).toEqual([]);
	});

	it('explains a refused download, so the agent can tell the user to ask an administrator', async () => {
		const { http, get } = graphReturning({
			attachments: [
				{
					contentType: 'reference',
					contentUrl: 'https://contoso.sharepoint.com/a.pdf',
					name: 'a.pdf',
				},
			],
		});
		const [file] = await fetchTeamsMessageFiles(http, channelActivity('100', '100'));
		get.mockRejectedValueOnce(Object.assign(new Error('403'), { response: { status: 403 } }));

		await expect(file.fetchData?.()).rejects.toBeInstanceOf(InboundAttachmentAccessError);
	});

	it('makes no Graph call for a direct message', async () => {
		const { http, get } = graphReturning({});

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
