---
title: Experimental_StdioMCPTransport
description: Create a transport for Model Context Protocol (MCP) clients to communicate with MCP servers using standard input and output streams
---

# `Experimental_StdioMCPTransport`

Creates a transport for Model Context Protocol (MCP) clients to communicate with MCP servers using standard input and output streams. This transport is only supported in Node.js environments.

This feature is experimental and may change or be removed in the future.

## Import

<Snippet
  text={`import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio"`}
  prompt={false}
/>

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'config',
      type: 'StdioConfig',
      description: 'Configuration for the MCP client.',
      properties: [
        {
          type: 'StdioConfig',
          parameters: [
            {
              name: 'command',
              type: 'string',
              description: 'The command to run the MCP server.',
            },
            {
              name: 'args',
              type: 'string[]',
              isOptional: true,
              description: 'The arguments to pass to the MCP server.',
            },
            {
              name: 'env',
              type: 'Record<string, string>',
              isOptional: true,
              description:
                'The environment variables to set for the MCP server.',
            },
            {
              name: 'stderr',
              type: 'IOType | Stream | number',
              isOptional: true,
              description: "The stream to write the MCP server's stderr to.",
            },
            {
              name: 'cwd',
              type: 'string',
              isOptional: true,
              description: 'The current working directory for the MCP server.',
            },
          ],
        },
      ],
    },
  ]}
/>
