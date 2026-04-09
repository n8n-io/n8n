import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const mcpServerArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      serverUrl: z.string().describe('The URL of the MCP server'),
      serverLabel: z.string().optional().describe('A label for the MCP server'),
      serverDescription: z
        .string()
        .optional()
        .describe('Description of the MCP server'),
      allowedTools: z
        .array(z.string())
        .optional()
        .describe('List of allowed tool names'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom headers to send'),
      authorization: z
        .string()
        .optional()
        .describe('Authorization header value'),
    }),
  ),
);

// MCP tool output varies based on which tool is called
const mcpServerOutputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      name: z.string(),
      arguments: z.string(),
      result: z.unknown(),
    }),
  ),
);

const mcpServerToolFactory = createProviderToolFactoryWithOutputSchema<
  {},
  {
    name: string;
    arguments: string;
    result: unknown;
  },
  {
    serverUrl: string;
    serverLabel?: string;
    serverDescription?: string;
    allowedTools?: string[];
    headers?: Record<string, string>;
    authorization?: string;
  }
>({
  id: 'xai.mcp',
  inputSchema: lazySchema(() => zodSchema(z.object({}))),
  outputSchema: mcpServerOutputSchema,
});

export const mcpServer = (args: Parameters<typeof mcpServerToolFactory>[0]) =>
  mcpServerToolFactory(args);
