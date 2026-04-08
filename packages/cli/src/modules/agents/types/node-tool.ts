import type { BuiltTool } from '@n8n/agents';
import type { z } from 'zod';

export interface NodeToolCredential {
	id: string;
	name: string;
}

export interface NodeToolDescriptor {
	readonly nodeType: string;
	readonly nodeTypeVersion: number;
	readonly nodeParameters: Record<string, unknown>;
	/** Credential slot name → { id, name } */
	readonly credentials: Record<string, NodeToolCredential>;
	/** Input schema for the LLM (JSON Schema) */
	readonly inputSchema?: Record<string, unknown>;
}

/**
 * Marker tool for executing a single n8n node as an agent tool.
 *
 * Exposed in the virtual `@n8n/agents-utils` package in the agent sandbox so
 * user code can write:
 * ```typescript
 * import { Agent } from '@n8n/agents';
 * import { ToolFromNode } from '@n8n/agents-utils';
 *
 * const sendEmail = new ToolFromNode({
 *   type: 'n8n-nodes-base.gmail',
 *   version: 2.1,
 *   parameters: { resource: 'message', operation: 'send', sendTo: '={{ $json.to }}' },
 *   credentials: { gmailOAuth2: { id: 'cred-id', name: 'My Gmail' } },
 * })
 *   .name('send-email')
 *   .description('Send an email via Gmail')
 *   .input(z.object({ to: z.string() }));
 * ```
 *
 * The compile step detects these markers via `tool.metadata.nodeTool` and
 * replaces them with fully-configured tools backed by EphemeralNodeExecutor.
 */
export class ToolFromNode {
	private readonly _nodeType: string;

	private readonly _nodeTypeVersion: number;

	private readonly _nodeParameters: Record<string, unknown>;

	private readonly _credentials: Record<string, NodeToolCredential>;

	private _name?: string;

	private _description?: string;

	private _inputSchema?: Record<string, unknown>;

	constructor(nodeSchema: {
		type: string;
		version: string | number;
		parameters?: Record<string, unknown>;
		credentials?: Record<string, { id?: string; name?: string }>;
	}) {
		this._nodeType = nodeSchema.type;
		this._nodeTypeVersion = Number(nodeSchema.version);
		this._nodeParameters = nodeSchema.parameters ?? {};

		const rawCreds = nodeSchema.credentials ?? {};
		this._credentials = {} as Record<string, NodeToolCredential>;
		for (const [slot, ref] of Object.entries(rawCreds)) {
			if (ref && (ref.id || ref.name)) {
				this._credentials[slot] = { id: ref.id ?? '', name: ref.name ?? '' };
			}
		}
	}

	name(n: string): this {
		this._name = n;
		return this;
	}

	description(d: string): this {
		this._description = d;
		return this;
	}

	input<S extends z.ZodObject<z.ZodRawShape>>(schema: S): this {
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
			const { zodToJsonSchema } = require('zod-to-json-schema');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			this._inputSchema = zodToJsonSchema(schema) as Record<string, unknown>;
		} catch {
			// If zod-to-json-schema is unavailable, skip schema storage
		}
		return this;
	}

	/** Produce a marker BuiltTool. Resolved at runtime by the platform via tool.metadata. */
	build(): BuiltTool {
		const toolName = this._name ?? `node-tool-${this._nodeType}`;
		return {
			name: toolName,
			description: this._description ?? `Execute the ${this._nodeType} node`,
			editable: false,
			metadata: {
				nodeTool: true,
				nodeType: this._nodeType,
				nodeTypeVersion: this._nodeTypeVersion,
				nodeParameters: this._nodeParameters,
				credentials: this._credentials,
				inputSchema: this._inputSchema,
			},
		};
	}
}
