import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { JSONValue } from '@ai-sdk/provider';
import { z } from 'zod/v4';

const jsonValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const mcpArgsSchema = lazySchema(() =>
  zodSchema(
    z
      .object({
        serverLabel: z.string(),
        allowedTools: z
          .union([
            z.array(z.string()),
            z.object({
              readOnly: z.boolean().optional(),
              toolNames: z.array(z.string()).optional(),
            }),
          ])
          .optional(),
        authorization: z.string().optional(),
        connectorId: z.string().optional(),
        headers: z.record(z.string(), z.string()).optional(),

        requireApproval: z
          .union([
            z.enum(['always', 'never']),
            z.object({
              never: z
                .object({
                  toolNames: z.array(z.string()).optional(),
                })
                .optional(),
            }),
          ])
          .optional(),
        serverDescription: z.string().optional(),
        serverUrl: z.string().optional(),
      })
      .refine(
        v => v.serverUrl != null || v.connectorId != null,
        'One of serverUrl or connectorId must be provided.',
      ),
  ),
);

const mcpInputSchema = lazySchema(() => zodSchema(z.object({})));

export const mcpOutputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      type: z.literal('call'),
      serverLabel: z.string(),
      name: z.string(),
      arguments: z.string(),
      output: z.string().nullish(),
      error: z.union([z.string(), jsonValueSchema]).optional(),
    }),
  ),
);

type McpArgs = {
  /** A label for this MCP server, used to identify it in tool calls. */
  serverLabel: string;
  /** List of allowed tool names or a filter object. */
  allowedTools?:
    | string[]
    | {
        readOnly?: boolean;
        toolNames?: string[];
      };
  /** OAuth access token usable with the remote MCP server or connector. */
  authorization?: string;
  /** Identifier for a service connector. */
  connectorId?: string;
  /** Optional HTTP headers to send to the MCP server. */
  headers?: Record<string, string>;
  /**
   * Which tools require approval before execution.
   */
  requireApproval?:
    | 'always'
    | 'never'
    | {
        never?: {
          toolNames?: string[];
        };
      };
  /** Optional description of the MCP server. */
  serverDescription?: string;
  /** URL for the MCP server. One of serverUrl or connectorId must be provided. */
  serverUrl?: string;
};

export const mcpToolFactory = createProviderToolFactoryWithOutputSchema<
  {},
  {
    type: 'call';
    serverLabel: string;
    name: string;
    arguments: string;
    output?: string | null;
    error?: JSONValue;
  },
  McpArgs
>({
  id: 'openai.mcp',
  inputSchema: mcpInputSchema,
  outputSchema: mcpOutputSchema,
});

export const mcp = (args: McpArgs) => mcpToolFactory(args);
