import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const shellInputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      action: z.object({
        commands: z.array(z.string()),
        timeoutMs: z.number().optional(),
        maxOutputLength: z.number().optional(),
      }),
    }),
  ),
);

export const shellOutputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      output: z.array(
        z.object({
          stdout: z.string(),
          stderr: z.string(),
          outcome: z.discriminatedUnion('type', [
            z.object({ type: z.literal('timeout') }),
            z.object({ type: z.literal('exit'), exitCode: z.number() }),
          ]),
        }),
      ),
    }),
  ),
);

const shellSkillsSchema = z
  .array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('skillReference'),
        skillId: z.string(),
        version: z.string().optional(),
      }),
      z.object({
        type: z.literal('inline'),
        name: z.string(),
        description: z.string(),
        source: z.object({
          type: z.literal('base64'),
          mediaType: z.literal('application/zip'),
          data: z.string(),
        }),
      }),
    ]),
  )
  .optional();

export const shellArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      environment: z
        .union([
          z.object({
            type: z.literal('containerAuto'),
            fileIds: z.array(z.string()).optional(),
            memoryLimit: z.enum(['1g', '4g', '16g', '64g']).optional(),
            networkPolicy: z
              .discriminatedUnion('type', [
                z.object({ type: z.literal('disabled') }),
                z.object({
                  type: z.literal('allowlist'),
                  allowedDomains: z.array(z.string()),
                  domainSecrets: z
                    .array(
                      z.object({
                        domain: z.string(),
                        name: z.string(),
                        value: z.string(),
                      }),
                    )
                    .optional(),
                }),
              ])
              .optional(),
            skills: shellSkillsSchema,
          }),
          z.object({
            type: z.literal('containerReference'),
            containerId: z.string(),
          }),
          z.object({
            type: z.literal('local').optional(),
            skills: z
              .array(
                z.object({
                  name: z.string(),
                  description: z.string(),
                  path: z.string(),
                }),
              )
              .optional(),
          }),
        ])
        .optional(),
    }),
  ),
);

type ShellArgs = {
  environment?:
    | {
        type: 'containerAuto';
        fileIds?: string[];
        memoryLimit?: '1g' | '4g' | '16g' | '64g';
        networkPolicy?:
          | { type: 'disabled' }
          | {
              type: 'allowlist';
              allowedDomains: string[];
              domainSecrets?: Array<{
                domain: string;
                name: string;
                value: string;
              }>;
            };
        skills?: Array<
          | { type: 'skillReference'; skillId: string; version?: string }
          | {
              type: 'inline';
              name: string;
              description: string;
              source: {
                type: 'base64';
                mediaType: 'application/zip';
                data: string;
              };
            }
        >;
      }
    | {
        type: 'containerReference';
        containerId: string;
      }
    | {
        type?: 'local';
        skills?: Array<{
          name: string;
          description: string;
          path: string;
        }>;
      };
};

export const shell = createProviderToolFactoryWithOutputSchema<
  {
    /**
     * Shell tool action containing commands to execute.
     */
    action: {
      /**
       * A list of shell commands to execute.
       */
      commands: string[];

      /**
       * Optional timeout in milliseconds for the commands.
       */
      timeoutMs?: number;

      /**
       * Optional maximum number of characters to return from each command.
       */
      maxOutputLength?: number;
    };
  },
  {
    /**
     * An array of shell call output contents.
     */
    output: Array<{
      /**
       * Standard output from the command.
       */
      stdout: string;

      /**
       * Standard error from the command.
       */
      stderr: string;

      /**
       * The outcome of the shell execution - either timeout or exit with code.
       */
      outcome: { type: 'timeout' } | { type: 'exit'; exitCode: number };
    }>;
  },
  ShellArgs
>({
  id: 'openai.shell',
  inputSchema: shellInputSchema,
  outputSchema: shellOutputSchema,
});
