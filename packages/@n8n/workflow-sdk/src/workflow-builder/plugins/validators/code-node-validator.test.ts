import { codeNodeValidator } from './code-node-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	parameters: Record<string, unknown>,
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.code',
		name: 'Transform',
		version: '2',
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return { instance: node, connections: new Map() };
}

function createContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

function issueCodes(parameters: Record<string, unknown>): string[] {
	const node = createMockNode(parameters);
	return codeNodeValidator
		.validateNode(node, createGraphNode(node), createContext())
		.map((i) => i.code);
}

function firstIssueMessage(parameters: Record<string, unknown>): string {
	const node = createMockNode(parameters);
	const issues = codeNodeValidator.validateNode(node, createGraphNode(node), createContext());
	return issues[0]?.message ?? '';
}

describe('codeNodeValidator', () => {
	it('has correct id', () => {
		expect(codeNodeValidator.id).toBe('core:code-node');
	});

	it('flags fetch() in jsCode', () => {
		const node = createMockNode({
			jsCode: 'const res = await fetch("https://api.example.com");\nreturn [];',
		});
		const issues = codeNodeValidator.validateNode(node, createGraphNode(node), createContext());
		expect(issues).toEqual([
			expect.objectContaining({ code: 'CODE_NODE_NETWORK_CALL', nodeName: 'Transform' }),
		]);
	});

	it('flags require("https")', () => {
		expect(issueCodes({ jsCode: "const https = require('https');\nreturn [];" })).toEqual([
			'CODE_NODE_NETWORK_CALL',
		]);
	});

	it('flags this.helpers.httpRequest', () => {
		expect(
			issueCodes({
				jsCode: "const res = await this.helpers.httpRequest({ url: 'https://x' });\nreturn [];",
			}),
		).toEqual(['CODE_NODE_NETWORK_CALL']);
	});

	it('flags require("imap") as a network-capable module', () => {
		const jsCode =
			"const Imap = require('imap');\nconst { simpleParser } = require('mailparser');\nreturn [];";
		expect(issueCodes({ jsCode })).toEqual(['CODE_NODE_NETWORK_CALL']);
		const message = firstIssueMessage({ jsCode });
		expect(message).toContain("imports 'imap'");
		expect(message).toContain('HTTP Request node');
		expect(message).toContain('Rewrite:');
	});

	it('flags require("luxon")', () => {
		const jsCode = "const { DateTime } = require('luxon');\nreturn [];";
		expect(issueCodes({ jsCode })).toEqual(['CODE_NODE_FORBIDDEN_IMPORT']);
		const message = firstIssueMessage({ jsCode });
		expect(message).toContain("imports 'luxon'");
		expect(message).toContain('Rewrite:');
		expect(message).toContain('remove the import');
		expect(message).toContain('$now');
	});

	it('flags require of arbitrary modules disallowed by default', () => {
		expect(issueCodes({ jsCode: "const fs = require('fs');\nreturn [];" })).toEqual([
			'CODE_NODE_FORBIDDEN_IMPORT',
		]);
		expect(firstIssueMessage({ jsCode: "const fs = require('fs');\nreturn [];" })).toContain(
			"imports 'fs'",
		);
	});

	it('flags static import of an arbitrary module', () => {
		expect(issueCodes({ jsCode: "import path from 'path';\nreturn [];" })).toEqual([
			'CODE_NODE_FORBIDDEN_IMPORT',
		]);
	});

	it('flags Python HTTP libraries', () => {
		const parameters = { language: 'python', pythonCode: 'import requests\nreturn []' };
		expect(issueCodes(parameters)).toEqual(['CODE_NODE_NETWORK_CALL']);
		expect(firstIssueMessage(parameters)).toContain('HTTP Request node');
		expect(firstIssueMessage(parameters)).toContain('Rewrite:');
	});

	it('flags nested template literals', () => {
		expect(
			issueCodes({
				jsCode: 'const inner = `x`;\nconst out = `hello ${`nested ${inner}`}`;\nreturn [];',
			}),
		).toEqual(['CODE_NESTED_TEMPLATE_LITERAL']);
	});

	it('allows flat template literals', () => {
		const node = createMockNode({
			jsCode: 'const out = `hello ${$json.name}`;\nreturn [{ json: { out } }];',
		});
		expect(codeNodeValidator.validateNode(node, createGraphNode(node), createContext())).toEqual(
			[],
		);
	});

	it('flags $input.all() in runOnceForEachItem mode', () => {
		const parameters = {
			mode: 'runOnceForEachItem',
			jsCode: 'return $input.all().map(i => i.json);',
		};
		expect(issueCodes(parameters)).toEqual(['CODE_MODE_API_MISUSE']);
		const message = firstIssueMessage(parameters);
		expect(message).toContain('Rewrite:');
		expect(message).toContain('runOnceForAllItems');
		expect(message).toContain('$json');
	});

	it('allows $input.all() in default runOnceForAllItems mode', () => {
		const node = createMockNode({
			jsCode: 'return $input.all().map(i => ({ json: i.json }));',
		});
		expect(codeNodeValidator.validateNode(node, createGraphNode(node), createContext())).toEqual(
			[],
		);
	});

	it('allows per-item $json without network calls', () => {
		const node = createMockNode({
			mode: 'runOnceForEachItem',
			jsCode: 'return { doubled: $json.n * 2 };',
		});
		expect(codeNodeValidator.validateNode(node, createGraphNode(node), createContext())).toEqual(
			[],
		);
	});
});
