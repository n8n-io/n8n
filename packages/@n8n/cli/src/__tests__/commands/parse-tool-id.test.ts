import { describe, it, expect } from 'vitest';

import { parseToolId, parseParamFlag } from '../../commands/exec/parse-tool-id';

describe('parseToolId', () => {
	it('parses a bare node name into the default package prefix', () => {
		expect(parseToolId('slack')).toEqual({ nodeType: 'n8n-nodes-base.slack' });
	});

	it('parses node + operation', () => {
		expect(parseToolId('set.json')).toEqual({
			nodeType: 'n8n-nodes-base.set',
			operation: 'json',
		});
	});

	it('parses node + resource + operation', () => {
		expect(parseToolId('slack.message.send')).toEqual({
			nodeType: 'n8n-nodes-base.slack',
			resource: 'message',
			operation: 'send',
		});
	});

	it('keeps a fully-qualified n8n-nodes-base id intact', () => {
		expect(parseToolId('n8n-nodes-base.slack.message.send')).toEqual({
			nodeType: 'n8n-nodes-base.slack',
			resource: 'message',
			operation: 'send',
		});
	});

	it('keeps a fully-qualified langchain id intact', () => {
		expect(parseToolId('@n8n/n8n-nodes-langchain.agent.run')).toEqual({
			nodeType: '@n8n/n8n-nodes-langchain.agent',
			operation: 'run',
		});
	});

	it('throws on empty input', () => {
		expect(() => parseToolId('')).toThrow();
	});

	it('throws when a known package prefix has no node name', () => {
		expect(() => parseToolId('n8n-nodes-base.')).toThrow();
	});
});

describe('parseParamFlag', () => {
	it('splits on the first equals sign', () => {
		expect(parseParamFlag('channel=#test')).toEqual({ key: 'channel', value: '#test' });
	});

	it('preserves equals signs in the value', () => {
		expect(parseParamFlag('expr=a=b=c')).toEqual({ key: 'expr', value: 'a=b=c' });
	});

	it('throws on a value without an equals sign', () => {
		expect(() => parseParamFlag('justakey')).toThrow();
	});

	it('throws on a leading equals sign', () => {
		expect(() => parseParamFlag('=value')).toThrow();
	});
});
