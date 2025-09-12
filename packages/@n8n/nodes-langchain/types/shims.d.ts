// Minimal ambient module declarations to satisfy IDE when workspace deps aren't built locally
// These are NO-OP shims and do not affect runtime behavior inside Docker.

declare module 'json-schema' {
	export interface JSONSchema7 {
		[key: string]: unknown;
	}
}

declare module '@modelcontextprotocol/sdk/client/streamableHttp.js' {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export class StreamableHTTPClientTransport {
		constructor(...args: any[]);
	}
}

declare module 'langchain/agents' {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export class Toolkit {
		constructor(...args: any[]);
	}
}
