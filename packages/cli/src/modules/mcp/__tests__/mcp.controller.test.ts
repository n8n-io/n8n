import type { Response } from 'express';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { ErrorReporter } from 'n8n-core';

import { McpController } from '../mcp.controller';
import type { McpService } from '../mcp.service';
import type { McpSettingsService } from '../mcp.settings.service';
import type { Telemetry } from '@/telemetry';
import { MCP_ENDPOINT_INFO, MCP_ACCESS_DISABLED_ERROR_MESSAGE } from '../mcp.constants';

describe('McpController', () => {
	let controller: McpController;
	let mockErrorReporter: ErrorReporter;
	let mockMcpService: McpService;
	let mockMcpSettingsService: McpSettingsService;
	let mockTelemetry: Telemetry;
	let mockLogger: Logger;

	beforeEach(() => {
		mockErrorReporter = mock<ErrorReporter>();
		mockMcpService = mock<McpService>();
		mockMcpSettingsService = mock<McpSettingsService>();
		mockTelemetry = mock<Telemetry>();
		mockLogger = mock<Logger>();

		controller = new McpController(
			mockErrorReporter,
			mockMcpService,
			mockMcpSettingsService,
			mockTelemetry,
			mockLogger,
		);
	});

	describe('OPTIONS /http - CORS Preflight', () => {
		it('should handle CORS preflight requests without authentication', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();

			await controller.handlePreflight(req, res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.header).toHaveBeenCalledWith(
				'Access-Control-Allow-Methods',
				'GET, POST, HEAD, OPTIONS',
			);
			expect(res.header).toHaveBeenCalledWith(
				'Access-Control-Allow-Headers',
				'Content-Type, Authorization, X-Requested-With',
			);
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.end).toHaveBeenCalled();
		});

		it('should not require authentication for OPTIONS requests', async () => {
			const req = mock<AuthenticatedRequest>();
			req.user = undefined as any;
			const res = mock<Response>();

			await controller.handlePreflight(req, res);

			expect(res.status).toHaveBeenCalledWith(204);
		});
	});

	describe('GET /http - Endpoint Discovery', () => {
		it('should return endpoint information when MCP is enabled', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(true);

			await controller.discoverEndpoint(req, res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(MCP_ENDPOINT_INFO);
		});

		it('should return 403 when MCP access is disabled', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(false);

			await controller.discoverEndpoint(req, res);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({
				error: 'MCP access is disabled',
				message: MCP_ACCESS_DISABLED_ERROR_MESSAGE,
			});
		});

		it('should not return 404 when MCP module is loaded', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(true);

			await controller.discoverEndpoint(req, res);

			expect(res.status).not.toHaveBeenCalledWith(404);
		});

		it('should set CORS headers for GET requests', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(true);

			await controller.discoverEndpoint(req, res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.header).toHaveBeenCalledWith(
				'Access-Control-Allow-Methods',
				'GET, POST, HEAD, OPTIONS',
			);
		});
	});

	describe('HEAD /http - Authentication Discovery', () => {
		it('should return 401 with WWW-Authenticate header', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();

			await controller.discoverAuthSchemeHead(req, res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.header).toHaveBeenCalledWith(
				'WWW-Authenticate',
				'Bearer realm="n8n MCP Server"',
			);
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.end).toHaveBeenCalled();
		});

		it('should not return 404 for HEAD requests', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();

			await controller.discoverAuthSchemeHead(req, res);

			expect(res.status).not.toHaveBeenCalledWith(404);
		});
	});

	describe('POST /http - MCP Requests', () => {
		it('should reject requests without authenticated user', async () => {
			const req = mock<AuthenticatedRequest>();
			req.user = undefined as any;
			req.body = { jsonrpc: '2.0', method: 'initialize', id: 1 };
			const res = mock<Response>();
			res.headersSent = false;

			await controller.build(req, res);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'MCP request rejected: No authenticated user',
			);
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				error: {
					code: -32001,
					message: 'Authentication required',
				},
				id: null,
			});
		});

		it('should reject requests when MCP access is disabled', async () => {
			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-123' } as any;
			req.body = { jsonrpc: '2.0', method: 'initialize', id: 1 };
			const res = mock<Response>();
			res.headersSent = false;
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(false);

			await controller.build(req, res);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'MCP request rejected: MCP access is disabled',
				expect.objectContaining({
					userId: 'user-123',
					method: 'initialize',
				}),
			);
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({
				jsonrpc: '2.0',
				error: {
					code: -32002,
					message: MCP_ACCESS_DISABLED_ERROR_MESSAGE,
				},
				id: 1,
			});
		});

		it('should not return 404 for authenticated POST requests', async () => {
			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-123' } as any;
			req.body = { jsonrpc: '2.0', method: 'initialize', id: 1 };
			const res = mock<Response>();
			res.headersSent = false;
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(false);

			await controller.build(req, res);

			expect(res.status).not.toHaveBeenCalledWith(404);
		});

		it('should set CORS headers for all POST responses', async () => {
			const req = mock<AuthenticatedRequest>();
			req.user = undefined as any;
			req.body = { jsonrpc: '2.0', method: 'initialize', id: 1 };
			const res = mock<Response>();
			res.headersSent = false;

			await controller.build(req, res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		});

		it('should log debug information for MCP requests', async () => {
			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-123' } as any;
			req.body = { jsonrpc: '2.0', method: 'tools/list', id: 2 };
			const res = mock<Response>();
			res.headersSent = false;
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(true);

			await controller.build(req, res);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'MCP Request received',
				expect.objectContaining({
					method: 'tools/list',
					hasUser: true,
					userId: 'user-123',
				}),
			);
		});
	});

	describe('Regression Tests for Issue #25199', () => {
		it('should NOT return 404 when MCP module is loaded and enabled', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(true);

			// Test all endpoints
			await controller.handlePreflight(req, res);
			expect(res.status).not.toHaveBeenCalledWith(404);

			await controller.discoverEndpoint(req, res);
			expect(res.status).not.toHaveBeenCalledWith(404);

			await controller.discoverAuthSchemeHead(req, res);
			expect(res.status).not.toHaveBeenCalledWith(404);
		});

		it('should return proper error codes, not 404, when MCP is disabled', async () => {
			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-123' } as any;
			req.body = { jsonrpc: '2.0', method: 'initialize', id: 1 };
			const res = mock<Response>();
			res.headersSent = false;
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(false);

			await controller.build(req, res);

			// Should return 403, not 404
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.status).not.toHaveBeenCalledWith(404);
		});

		it('should handle OPTIONS requests for CORS preflight (was commented out)', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();

			await controller.handlePreflight(req, res);

			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.end).toHaveBeenCalled();
		});

		it('should provide endpoint discovery via GET (was missing)', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(true);

			await controller.discoverEndpoint(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(MCP_ENDPOINT_INFO);
		});

		it('should return clear error message with instructions when disabled', async () => {
			const req = mock<AuthenticatedRequest>();
			const res = mock<Response>();
			mockMcpSettingsService.getEnabled = jest.fn().mockResolvedValue(false);

			await controller.discoverEndpoint(req, res);

			expect(res.json).toHaveBeenCalledWith({
				error: 'MCP access is disabled',
				message: expect.stringContaining('Settings > MCP Access'),
			});
			expect(res.json).toHaveBeenCalledWith({
				error: 'MCP access is disabled',
				message: expect.stringContaining('PATCH /rest/mcp/settings'),
			});
		});
	});
});
