import { createProviderToolFactory } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { lazySchema, zodSchema } from '@ai-sdk/provider-utils';

export const textEditor_20250728ArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      maxCharacters: z.number().optional(),
    }),
  ),
);

const textEditor_20250728InputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      command: z.enum(['view', 'create', 'str_replace', 'insert']),
      path: z.string(),
      file_text: z.string().optional(),
      insert_line: z.number().int().optional(),
      new_str: z.string().optional(),
      insert_text: z.string().optional(),
      old_str: z.string().optional(),
      view_range: z.array(z.number().int()).optional(),
    }),
  ),
);

const factory = createProviderToolFactory<
  {
    /**
     * The commands to run. Allowed options are: `view`, `create`, `str_replace`, `insert`.
     * Note: `undo_edit` is not supported in Claude 4 models.
     */
    command: 'view' | 'create' | 'str_replace' | 'insert';

    /**
     * Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.
     */
    path: string;

    /**
     * Required parameter of `create` command, with the content of the file to be created.
     */
    file_text?: string;

    /**
     * Required parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`.
     */
    insert_line?: number;

    /**
     * Optional parameter of `str_replace` command containing the new string (if not given, no string will be added).
     */
    new_str?: string;

    /**
     * Required parameter of `insert` command containing the text to insert.
     */
    insert_text?: string;

    /**
     * Required parameter of `str_replace` command containing the string in `path` to replace.
     */
    old_str?: string;

    /**
     * Optional parameter of `view` command when `path` points to a file. If none is given, the full file is shown. If provided, the file will be shown in the indicated line number range, e.g. [11, 12] will show lines 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all lines from `start_line` to the end of the file.
     */
    view_range?: number[];
  },
  {
    /**
     * Optional parameter to control truncation when viewing large files. Only compatible with text_editor_20250728 and later versions.
     */
    maxCharacters?: number;
  }
>({
  id: 'anthropic.text_editor_20250728',
  inputSchema: textEditor_20250728InputSchema,
});

export const textEditor_20250728 = (
  args: Parameters<typeof factory>[0] = {}, // default
) => {
  return factory(args);
};
