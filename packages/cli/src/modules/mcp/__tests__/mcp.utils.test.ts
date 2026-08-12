import type { AuthenticatedRequest } from '@n8n/db';
import type { Request } from 'express';
import { mock } from 'vitest-mock-extended';

import { MCP_CLIENT_INFO_META_KEY, MCP_PROTOCOL_VERSION_META_KEY } from '../mcp.constants';
import { getClientInfo, getProtocolVersion, getToolName, getToolArguments } from '../mcp.utils';

describe('mcp.utils', () => {
	describe('getClientInfo', () => {
		it('should return clientInfo from valid JSON-RPC request', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'tools/call',
					params: {
						clientInfo: {
							name: 'test-client',
							version: '1.0.0',
						},
					},
					id: 1,
				},
			} as Request;

			const result = getClientInfo(req);
			expect(result).toEqual({
				name: 'test-client',
				version: '1.0.0',
			});
		});

		it('should return undefined when clientInfo is missing', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'tools/call',
					params: {},
					id: 1,
				},
			} as Request;

			const result = getClientInfo(req);
			expect(result).toBeUndefined();
		});

		it('should return undefined when params is missing', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'tools/call',
					id: 1,
				},
			} as Request;

			const result = getClientInfo(req);
			expect(result).toBeUndefined();
		});

		it('should return undefined when body is not a valid JSON-RPC request', () => {
			const req = {
				body: 'invalid',
			} as Request;

			const result = getClientInfo(req);
			expect(result).toBeUndefined();
		});

		it('should return undefined when body is null', () => {
			const req = {
				body: null,
			} as Request;

			const result = getClientInfo(req);
			expect(result).toBeUndefined();
		});

		it('should return undefined when body is an array', () => {
			const req = {
				body: [],
			} as Request;

			const result = getClientInfo(req);
			expect(result).toBeUndefined();
		});

		it('should handle clientInfo with partial information', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'tools/call',
					params: {
						clientInfo: {
							name: 'test-client',
						},
					},
					id: 1,
				},
			} as Request;

			const result = getClientInfo(req);
			expect(result).toEqual({
				name: 'test-client',
			});
		});

		it('should work with AuthenticatedRequest type', () => {
			const req = mock<AuthenticatedRequest>();
			req.body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					clientInfo: {
						name: 'authenticated-client',
						version: '2.0.0',
					},
				},
				id: 1,
			};

			const result = getClientInfo(req);
			expect(result).toEqual({
				name: 'authenticated-client',
				version: '2.0.0',
			});
		});

		it('should read clientInfo from the 2026-07-28 _meta envelope', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'server/discover',
					params: {
						_meta: {
							[MCP_CLIENT_INFO_META_KEY]: { name: 'Claude', version: '3.0.0' },
						},
					},
					id: 1,
				},
			} as Request;

			expect(getClientInfo(req)).toEqual({ name: 'Claude', version: '3.0.0' });
		});

		it('should prefer the _meta envelope over the legacy params.clientInfo', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'tools/call',
					params: {
						clientInfo: { name: 'legacy', version: '1.0.0' },
						_meta: {
							[MCP_CLIENT_INFO_META_KEY]: { name: 'modern', version: '2.0.0' },
						},
					},
					id: 1,
				},
			} as Request;

			expect(getClientInfo(req)).toEqual({ name: 'modern', version: '2.0.0' });
		});

		it('should handle a partial _meta clientInfo (name only)', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'server/discover',
					params: {
						_meta: { [MCP_CLIENT_INFO_META_KEY]: { name: 'Claude' } },
					},
					id: 1,
				},
			} as Request;

			expect(getClientInfo(req)).toEqual({ name: 'Claude', version: undefined });
		});
	});

	describe('getProtocolVersion', () => {
		it('should read the protocol version from the _meta envelope', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'server/discover',
					params: {
						_meta: { [MCP_PROTOCOL_VERSION_META_KEY]: '2026-07-28' },
					},
					id: 1,
				},
			} as Request;

			expect(getProtocolVersion(req)).toBe('2026-07-28');
		});

		it('should return undefined when the _meta envelope is absent (legacy client)', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'initialize',
					params: { clientInfo: { name: 'legacy', version: '1.0.0' } },
					id: 1,
				},
			} as Request;

			expect(getProtocolVersion(req)).toBeUndefined();
		});

		it('should return undefined when the version is not a string', () => {
			const req = {
				body: {
					jsonrpc: '2.0',
					method: 'server/discover',
					params: { _meta: { [MCP_PROTOCOL_VERSION_META_KEY]: 20260728 } },
					id: 1,
				},
			} as Request;

			expect(getProtocolVersion(req)).toBeUndefined();
		});

		it('should return undefined when body is not a valid JSON-RPC request', () => {
			expect(getProtocolVersion({ body: 'invalid' } as Request)).toBeUndefined();
		});
	});

	describe('getToolName', () => {
		it('should return tool name from valid JSON-RPC request', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					name: 'search-workflows',
				},
				id: 1,
			};

			const result = getToolName(body);
			expect(result).toBe('search-workflows');
		});

		it('should return "unknown" when name is missing', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {},
				id: 1,
			};

			const result = getToolName(body);
			expect(result).toBe('unknown');
		});

		it('should return "unknown" when params is missing', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				id: 1,
			};

			const result = getToolName(body);
			expect(result).toBe('unknown');
		});

		it('should return "unknown" when body is not a valid JSON-RPC request', () => {
			const result = getToolName('invalid');
			expect(result).toBe('unknown');
		});

		it('should return "unknown" when name is not a string', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					name: 123,
				},
				id: 1,
			};

			const result = getToolName(body);
			expect(result).toBe('unknown');
		});

		it('should return "unknown" when body is null', () => {
			const result = getToolName(null);
			expect(result).toBe('unknown');
		});

		it('should return "unknown" when body is undefined', () => {
			const result = getToolName(undefined);
			expect(result).toBe('unknown');
		});

		it('should return "unknown" when body is an array', () => {
			const result = getToolName([]);
			expect(result).toBe('unknown');
		});

		it('should return "unknown" when name is an object', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					name: { tool: 'test' },
				},
				id: 1,
			};

			const result = getToolName(body);
			expect(result).toBe('unknown');
		});
	});

	describe('getToolArguments', () => {
		it('should return arguments from valid JSON-RPC request', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					name: 'search-workflows',
					arguments: {
						limit: 10,
						active: true,
						name: 'test',
					},
				},
				id: 1,
			};

			const result = getToolArguments(body);
			expect(result).toEqual({
				limit: 10,
				active: true,
				name: 'test',
			});
		});

		it('should return empty object when arguments is missing', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					name: 'search-workflows',
				},
				id: 1,
			};

			const result = getToolArguments(body);
			expect(result).toEqual({});
		});

		it('should return empty object when params is missing', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				id: 1,
			};

			const result = getToolArguments(body);
			expect(result).toEqual({});
		});

		it('should return empty object when body is not a valid JSON-RPC request', () => {
			const result = getToolArguments('invalid');
			expect(result).toEqual({});
		});

		it('should return empty object when arguments is not an object', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					name: 'search-workflows',
					arguments: 'invalid',
				},
				id: 1,
			};

			const result = getToolArguments(body);
			expect(result).toEqual({});
		});

		it('should return empty object when arguments is null', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					name: 'search-workflows',
					arguments: null,
				},
				id: 1,
			};

			const result = getToolArguments(body);
			expect(result).toEqual({});
		});

		it('should return empty object when arguments is an array', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					name: 'search-workflows',
					arguments: [1, 2, 3],
				},
				id: 1,
			};

			const result = getToolArguments(body);
			expect(result).toEqual({});
		});

		it('should return empty object when body is null', () => {
			const result = getToolArguments(null);
			expect(result).toEqual({});
		});

		it('should return empty object when body is undefined', () => {
			const result = getToolArguments(undefined);
			expect(result).toEqual({});
		});

		it('should handle nested objects in arguments', () => {
			const body = {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: {
					name: 'complex-tool',
					arguments: {
						config: {
							nested: {
								value: 'test',
							},
						},
						array: [1, 2, 3],
						boolean: false,
					},
				},
				id: 1,
			};

			const result = getToolArguments(body);
			expect(result).toEqual({
				config: {
					nested: {
						value: 'test',
					},
				},
				array: [1, 2, 3],
				boolean: false,
			});
		});
	});
});
