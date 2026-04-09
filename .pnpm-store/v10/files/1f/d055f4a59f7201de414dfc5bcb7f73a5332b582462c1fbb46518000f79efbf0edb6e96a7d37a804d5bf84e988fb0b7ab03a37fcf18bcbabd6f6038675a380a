import {
  createProviderToolFactory,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

const memory_20250818InputSchema = lazySchema(() =>
  zodSchema(
    z.discriminatedUnion('command', [
      z.object({
        command: z.literal('view'),
        path: z.string(),
        view_range: z.tuple([z.number(), z.number()]).optional(),
      }),
      z.object({
        command: z.literal('create'),
        path: z.string(),
        file_text: z.string(),
      }),
      z.object({
        command: z.literal('str_replace'),
        path: z.string(),
        old_str: z.string(),
        new_str: z.string(),
      }),
      z.object({
        command: z.literal('insert'),
        path: z.string(),
        insert_line: z.number(),
        insert_text: z.string(),
      }),
      z.object({
        command: z.literal('delete'),
        path: z.string(),
      }),
      z.object({
        command: z.literal('rename'),
        old_path: z.string(),
        new_path: z.string(),
      }),
    ]),
  ),
);

export const memory_20250818 = createProviderToolFactory<
  | { command: 'view'; path: string; view_range?: [number, number] }
  | { command: 'create'; path: string; file_text: string }
  | { command: 'str_replace'; path: string; old_str: string; new_str: string }
  | {
      command: 'insert';
      path: string;
      insert_line: number;
      insert_text: string;
    }
  | { command: 'delete'; path: string }
  | { command: 'rename'; old_path: string; new_path: string },
  {}
>({
  id: 'anthropic.memory_20250818',
  inputSchema: memory_20250818InputSchema,
});
