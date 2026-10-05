import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import * as root from '../index';

const SRC = path.resolve(__dirname, '..');

const exportedTypes = (file: string) =>
	[...readFileSync(path.join(SRC, file), 'utf8').matchAll(/export (type )?\{([^}]*)\}/g)]
		.flatMap(([, typeOnly, names = '']) =>
			names
				.split(',')
				.map((name) => name.trim())
				.filter((name) => typeOnly !== undefined || name.startsWith('type '))
				.map((name) => name.replace(/^type /, '')),
		)
		.filter((name) => name !== '')
		.sort();

describe('the root of @n8n/node-sdk', () => {
	it('exports only the authoring values', () => {
		expect(Object.keys(root).sort()).toEqual([
			'OperationalError',
			'Schema',
			'UserError',
			'assertFinished',
			'defineNode',
			'defineResource',
			'isHttpError',
			'isRecord',
			'isReplySchema',
			'limitOf',
			'list',
			'matches',
			'nextLinkOf',
			'nextOffsetOf',
			'pageValueOf',
			'pages',
			'paging',
			'parse',
			'parseReply',
			'path',
			'promptMessages',
			'promptReply',
			'provider',
			'readAs',
			'ref',
			'replyOutput',
			'replyOutputOf',
			'replySchema',
			't',
			'validate',
		]);
	});

	it('exports only the authoring types', () => {
		expect(exportedTypes('index.ts')).toEqual([
			'Action',
			'ActionBinding',
			'ActionFlow',
			'ActionInputs',
			'ActionOutputs',
			'ActionPath',
			'ActionSpec',
			'ActionUi',
			'AnySchema',
			'BatchContext',
			'Binaries',
			'Binary',
			'BinaryMeta',
			'ChatMessage',
			'ChatModel',
			'ChatReply',
			'ChatRequest',
			'ChatUsage',
			'CodeRequest',
			'CodeRunner',
			'ContextOf',
			'CountedInputsContext',
			'CredentialTypeOf',
			'DataTable',
			'DataTableColumn',
			'DataTableColumnType',
			'DataTableCondition',
			'DataTableFilter',
			'DataTableInfo',
			'DataTableListQuery',
			'DataTableOperator',
			'DataTableQuery',
			'DataTableRef',
			'DataTableRow',
			'DataTableValue',
			'DataTableValues',
			'DataTables',
			'Egress',
			'EgressHost',
			'Embeddings',
			'Emit',
			'EncodedPath',
			'FieldUi',
			'HostImport',
			'HostImports',
			'Http',
			'HttpError',
			'HttpMethod',
			'HttpRequest',
			'ImportsOf',
			'Infer',
			'InputCount',
			'InputItem',
			'InputsContext',
			'JsonSchema',
			'Lineage',
			'ListBinding',
			'LogLevel',
			'Loose',
			'Memory',
			'NativeEvent',
			'NativeNode',
			'NativeTrigger',
			'NodeBuilder',
			'NodeDefinition',
			'NodeResource',
			'ObjectOf',
			'OptionLabel',
			'OutputName',
			'OutputsPerEntry',
			'PageParam',
			'PageSize',
			'PageState',
			'Pages',
			'PagesOptions',
			'PollConfig',
			'PollCursor',
			'ProviderCapabilities',
			'ProviderKind',
			'ProviderSpec',
			'Registration',
			'RequestBinding',
			'RequestPath',
			'RequestValue',
			'Resource',
			'ResourceField',
			'ResourcePath',
			'ResponsePage',
			'RunContext',
			'RunContextOf',
			'RunHost',
			'RunInput',
			'RunLimits',
			'RunResult',
			'ScopeOf',
			'Shape',
			'Signature',
			'Tool',
			'ToolCall',
			'ToolDefinition',
			'Trigger',
			'TriggerKind',
			'TriggerReply',
			'TriggerSpec',
			'Wait',
			'WebhookConfig',
			'WebhookEndpoint',
			'WebhookRequest',
			'Widgets',
		]);
	});

	it('names each export of an entry point, with no export * and no local declaration', () => {
		const entries = [
			'index.ts',
			...readdirSync(path.join(SRC, 'entry')).map((file) => `entry/${file}`),
		];
		expect(
			entries.filter((file) =>
				/export \*|^export (type (?!\{)|interface |class |const |let |function |async |enum |abstract |declare |default )/m.test(
					readFileSync(path.join(SRC, file), 'utf8'),
				),
			),
		).toEqual([]);
	});
});
