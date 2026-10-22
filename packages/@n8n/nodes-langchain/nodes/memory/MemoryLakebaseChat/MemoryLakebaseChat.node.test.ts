import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { getActiveCredentialType } from 'n8n-nodes-base/dist/nodes/Databricks/actions/helpers';
import { resolveLakebaseTableUrl } from 'n8n-nodes-base/dist/nodes/Databricks/actions/lakebase/helpers';
import {
	LAKEBASE_MAX_PAGES,
	LAKEBASE_PAGE_SIZE,
} from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import { lakebaseApiRequest } from 'n8n-nodes-base/dist/nodes/Databricks/transport';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { INode, ISupplyDataFunctions, JsonObject } from 'n8n-workflow';
import type { Mock } from 'vitest';

const bufferWindowMemoryConstructor = vi.fn();

vi.mock('@langchain/classic/memory', () => ({
	BufferWindowMemory: class {
		constructor(args: unknown) {
			bufferWindowMemoryConstructor(args);
		}
	},
}));

vi.mock('n8n-nodes-base/dist/nodes/Databricks/transport', async (importOriginal) => ({
	...(await importOriginal<object>()),
	lakebaseApiRequest: vi.fn(),
}));

vi.mock('n8n-nodes-base/dist/nodes/Databricks/actions/lakebase/helpers', () => ({
	resolveLakebaseTableUrl: vi.fn(),
}));

vi.mock('n8n-nodes-base/dist/nodes/Databricks/methods/listSearch', () => ({
	getLakebaseProjects: vi.fn(),
	getLakebaseBranches: vi.fn(),
	getLakebaseDatabases: vi.fn(),
	getLakebaseSchemas: vi.fn(),
}));

vi.mock('@n8n/ai-utilities', () => ({
	logWrapper: (memory: unknown) => memory,
	getConnectionHintNoticeField: () => ({ name: 'notice', type: 'notice', default: '' }),
}));

vi.mock('@utils/helpers', () => ({
	getSessionId: () => 'fixed-session',
}));

import { LakebaseChatMessageHistory, MemoryLakebaseChat } from './MemoryLakebaseChat.node';

const node: INode = {
	id: '1',
	name: 'Databricks Lakebase Chat Memory',
	type: '@n8n/n8n-nodes-langchain.memoryLakebaseChat',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const TABLE_URL = 'https://h/api/2.0/workspace/1/rest/db/public/t';

class AxiosError extends Error {
	constructor(
		message: string,
		readonly response: { status: number; data: unknown },
	) {
		super(message);
	}
}

const apiError = (status: number, data: unknown) =>
	new NodeApiError(
		node,
		new AxiosError(`Request failed with status code ${status}`, {
			status,
			data,
		}) as unknown as JsonObject,
	);

const request = lakebaseApiRequest as unknown as Mock;

function createContext(params: Record<string, unknown> = {}): ISupplyDataFunctions {
	return {
		getNode: () => node,
		getInputData: () => [],
		getNodeParameter: vi.fn((name: string) => params[name]),
	} as unknown as ISupplyDataFunctions;
}

function createStore(context = createContext()) {
	return new LakebaseChatMessageHistory(context, {
		tableUrl: TABLE_URL,
		schema: 'public',
		table: 'n8n_chat_histories',
		sessionId: 'fixed-session',
	});
}

describe('MemoryLakebaseChat', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('description', () => {
		const { description } = new MemoryLakebaseChat();
		const byName = (name: string) => description.properties.find((p) => p.name === name);

		it('should show the four Lakebase locators without a resource condition', () => {
			for (const name of [
				'lakebaseProject',
				'lakebaseBranch',
				'lakebaseDatabase',
				'lakebaseSchema',
			]) {
				const property = byName(name);
				expect(property?.type).toBe('resourceLocator');
				expect(property?.displayOptions).toBeUndefined();
			}
		});

		it('should take the table as a plain name that defaults to n8n_chat_histories', () => {
			// A locator default is cleared when the project is picked, so the table is a string
			expect(byName('lakebaseTable')).toMatchObject({
				type: 'string',
				default: 'n8n_chat_histories',
				required: true,
			});
		});

		it('should stay out of the node picker until Lakebase ships', () => {
			expect(description.hidden).toBe(true);
		});

		it('should pin the authentication to OAuth2 through a hidden parameter', () => {
			expect(byName('authentication')).toMatchObject({ type: 'hidden', default: 'oAuth2' });
			// The nodes-base helper reads the parameter by name, so the default must be the value it compares against
			const context = createContext({ authentication: byName('authentication')?.default });
			expect(getActiveCredentialType(context)).toBe('databricksOAuth2Api');
		});
	});

	describe('LakebaseChatMessageHistory', () => {
		it('should post a message in the shape the Postgres store writes', async () => {
			request.mockResolvedValueOnce(undefined);

			await createStore().addMessage(new HumanMessage('hi'));

			expect(request).toHaveBeenCalledTimes(1);
			expect(request.mock.calls[0][1]).toEqual({
				method: 'POST',
				url: TABLE_URL,
				json: true,
				body: [
					{
						session_id: 'fixed-session',
						message: { content: 'hi', additional_kwargs: {}, response_metadata: {}, type: 'human' },
					},
				],
			});
		});

		it('should write a whole turn in one request', async () => {
			request.mockResolvedValueOnce(undefined);

			await createStore().addMessages([new HumanMessage('hi'), new AIMessage('hello')]);

			expect(request).toHaveBeenCalledTimes(1);
			const { body } = request.mock.calls[0][1] as { body: Array<{ message: { type: string } }> };
			expect(body.map((row) => row.message.type)).toEqual(['human', 'ai']);
		});

		it('should not post an empty turn', async () => {
			await createStore().addMessages([]);

			expect(request).not.toHaveBeenCalled();
		});

		it('should read a session in one request when the count fits a page', async () => {
			request.mockResolvedValueOnce({
				body: [
					{
						message: {
							type: 'ai',
							content: 'hello',
							additional_kwargs: {},
							response_metadata: {},
							tool_calls: [],
							invalid_tool_calls: [],
						},
					},
				],
				headers: { 'content-range': '0-0/1' },
			});

			const messages = await createStore().getMessages();

			expect(request).toHaveBeenCalledTimes(1);
			expect(request.mock.calls[0][1]).toEqual({
				method: 'GET',
				url: TABLE_URL,
				json: true,
				qs: { session_id: 'eq.fixed-session', order: 'id.asc', limit: 1000, offset: 0 },
				headers: { Accept: 'application/json', Prefer: 'count=exact' },
				returnFullResponse: true,
			});
			expect(messages).toHaveLength(1);
			expect(messages[0]).toBeInstanceOf(AIMessage);
			expect(messages[0].content).toBe('hello');
		});

		it('should page from the received row count until the exact count is reached', async () => {
			const row = (content: string) => ({
				message: { type: 'human', content, additional_kwargs: {}, response_metadata: {} },
			});
			request
				.mockResolvedValueOnce({
					body: [row('a'), row('b')],
					headers: { 'content-range': '0-1/3' },
				})
				.mockResolvedValueOnce({ body: [row('c')], headers: { 'content-range': '2-2/3' } });

			const messages = await createStore().getMessages();

			expect(request).toHaveBeenCalledTimes(2);
			expect(request.mock.calls[1][1].qs).toEqual({
				session_id: 'eq.fixed-session',
				order: 'id.asc',
				limit: 1000,
				offset: 2,
			});
			expect(messages.map((m) => m.content)).toEqual(['a', 'b', 'c']);
		});

		it('should stop on the first empty page when the count header is missing', async () => {
			request
				.mockResolvedValueOnce({
					body: [{ message: { type: 'human', content: 'a', additional_kwargs: {} } }],
					headers: {},
				})
				.mockResolvedValueOnce({ body: [], headers: {} });

			const messages = await createStore().getMessages();

			expect(request).toHaveBeenCalledTimes(2);
			expect(messages.map((m) => m.content)).toEqual(['a']);
		});

		it('should fail at the page cap rather than return the oldest rows', async () => {
			request.mockResolvedValue({
				body: [{ message: { type: 'human', content: 'x', additional_kwargs: {} } }],
				headers: { 'content-range': `0-0/${LAKEBASE_MAX_PAGES + 1}` },
			});

			await expect(createStore().getMessages()).rejects.toThrow(
				`The session holds more rows than one run can read (${LAKEBASE_MAX_PAGES * LAKEBASE_PAGE_SIZE})`,
			);
			expect(request).toHaveBeenCalledTimes(LAKEBASE_MAX_PAGES);
		});

		it('should delete the session rows', async () => {
			request.mockResolvedValueOnce(undefined);

			await createStore().clear();

			expect(request).toHaveBeenCalledTimes(1);
			expect(request.mock.calls[0][1]).toEqual({
				method: 'DELETE',
				url: TABLE_URL,
				json: true,
				qs: { session_id: 'eq.fixed-session' },
			});
		});

		it('should rethrow errors other than a missing table unchanged', async () => {
			const permissionDenied = apiError(403, { code: '42501', message: 'permission denied' });
			request.mockRejectedValueOnce(permissionDenied);
			await expect(createStore().clear()).rejects.toBe(permissionDenied);

			const plain = new Error('boom');
			request.mockRejectedValueOnce(plain);
			await expect(createStore().clear()).rejects.toBe(plain);
		});
	});

	describe('supplyData', () => {
		it('should resolve the table URL from the locators and wire the store into a window memory', async () => {
			(resolveLakebaseTableUrl as unknown as Mock).mockResolvedValue(TABLE_URL);
			request.mockResolvedValueOnce(undefined);
			const context = createContext({
				lakebaseSchema: 'public',
				lakebaseTable: 'n8n_chat_histories',
				contextWindowLength: 7,
			});

			await new MemoryLakebaseChat().supplyData.call(context, 0);

			expect(resolveLakebaseTableUrl).toHaveBeenCalledWith(context, 0);
			expect(bufferWindowMemoryConstructor).toHaveBeenCalledTimes(1);
			const args = bufferWindowMemoryConstructor.mock.calls[0][0] as {
				chatHistory: LakebaseChatMessageHistory;
				memoryKey: string;
				returnMessages: boolean;
				k: number;
			};
			expect(args).toMatchObject({ memoryKey: 'chat_history', returnMessages: true, k: 7 });
			expect(args.chatHistory).toBeInstanceOf(LakebaseChatMessageHistory);

			await args.chatHistory.clear();

			expect(request).toHaveBeenCalledWith(
				context,
				expect.objectContaining({
					method: 'DELETE',
					url: TABLE_URL,
					qs: { session_id: 'eq.fixed-session' },
				}),
			);
		});

		it.each([
			['PGRST205', "Could not find the table 'analytics.chat_log' in the schema cache"],
			['42P01', 'relation "analytics.chat_log" does not exist'],
		])(
			'should explain a missing table (%s) with the SQL to create and grant it',
			async (code, apiMessage) => {
				(resolveLakebaseTableUrl as unknown as Mock).mockResolvedValue(TABLE_URL);
				request.mockRejectedValueOnce(apiError(404, { code, message: apiMessage }));
				const context = createContext({
					lakebaseSchema: 'analytics',
					lakebaseTable: 'chat_log',
					contextWindowLength: 5,
				});

				await new MemoryLakebaseChat().supplyData.call(context, 0);
				const { chatHistory } = bufferWindowMemoryConstructor.mock.calls[0][0] as {
					chatHistory: LakebaseChatMessageHistory;
				};

				const error = await chatHistory.getMessages().catch((e: unknown) => e);

				expect(error).toBeInstanceOf(NodeOperationError);
				const { message, description } = error as NodeOperationError;
				expect(message).toBe('Table analytics.chat_log does not exist');
				expect(description).toContain(
					'`CREATE TABLE "analytics"."chat_log" (id SERIAL PRIMARY KEY, session_id VARCHAR(255) NOT NULL, message JSONB NOT NULL);`',
				);
				expect(description).toContain('`CREATE INDEX ON "analytics"."chat_log" (session_id, id);`');
				expect(description).toContain('`GRANT USAGE ON SCHEMA "analytics" TO "your-role";`');
				expect(description).toContain(
					'`GRANT SELECT, INSERT, DELETE ON "analytics"."chat_log" TO "your-role";`',
				);
				expect(description).toContain(
					'`GRANT USAGE ON SEQUENCE "analytics"."chat_log_id_seq" TO "your-role";`',
				);
				// The error view strips any tag it does not know, so a <placeholder> would vanish
				expect(String(description).replaceAll('<br>', '')).not.toMatch(/<[^\s>]+>/);
			},
		);

		it.each([
			'permission denied for schema analytics',
			'permission denied for table chat_log',
			'permission denied for sequence chat_log_id_seq',
		])('should explain "%s" with the GRANT statements only', async (apiMessage) => {
			(resolveLakebaseTableUrl as unknown as Mock).mockResolvedValue(TABLE_URL);
			request.mockRejectedValueOnce(apiError(403, { code: '42501', message: apiMessage }));
			const context = createContext({
				lakebaseSchema: 'analytics',
				lakebaseTable: 'chat_log',
				contextWindowLength: 5,
			});

			await new MemoryLakebaseChat().supplyData.call(context, 0);
			const { chatHistory } = bufferWindowMemoryConstructor.mock.calls[0][0] as {
				chatHistory: LakebaseChatMessageHistory;
			};

			const error = await chatHistory.getMessages().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeOperationError);
			const { message, description } = error as NodeOperationError;
			expect(message).toBe('The OAuth2 identity cannot use table analytics.chat_log');
			expect(description).not.toContain('CREATE TABLE');
			expect(description).toContain('`GRANT USAGE ON SCHEMA "analytics" TO "your-role";`');
			expect(description).toContain(
				'`GRANT SELECT, INSERT, DELETE ON "analytics"."chat_log" TO "your-role";`',
			);
			expect(description).toContain(
				'`GRANT USAGE ON SEQUENCE "analytics"."chat_log_id_seq" TO "your-role";`',
			);
			expect(String(description).replaceAll('<br>', '')).not.toMatch(/<[^\s>]+>/);
		});

		it('should leave a set-role 42501 error to the transport hint rather than show the GRANT statements', async () => {
			(resolveLakebaseTableUrl as unknown as Mock).mockResolvedValue(TABLE_URL);
			const apiFailure = apiError(403, {
				code: '42501',
				message: 'permission denied to set role "owner@example.com"',
			});
			request.mockRejectedValueOnce(apiFailure);
			const context = createContext({
				lakebaseSchema: 'analytics',
				lakebaseTable: 'chat_log',
				contextWindowLength: 5,
			});

			await new MemoryLakebaseChat().supplyData.call(context, 0);
			const { chatHistory } = bufferWindowMemoryConstructor.mock.calls[0][0] as {
				chatHistory: LakebaseChatMessageHistory;
			};

			await expect(chatHistory.getMessages()).rejects.toBe(apiFailure);
		});
	});
});
