import {
  createProviderToolFactory,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

const textEditor_20241022InputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      command: z.enum(['view', 'create', 'str_replace', 'insert', 'undo_edit']),
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

export const textEditor_20241022 = createProviderToolFactory<
  {
    /**
     * The commands to run. Allowed options are: `view`, `create`, `str_replace`, `insert`, `undo_edit`.
     */
    command: 'view' | 'create' | 'str_replace' | 'insert' | 'undo_edit';

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
  {}
>({
  id: 'anthropic.text_editor_20241022',
  inputSchema: textEditor_20241022InputSchema,
});
