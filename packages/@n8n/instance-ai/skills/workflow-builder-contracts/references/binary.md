# Binary Files

A file stays in the n8n binary data store. A lambda reads it as
`item.binary.<key>`, with `mimeType`, `fileName`, `fileExtension`,
`fileSize` and `bytes`.

- A binary field takes a binary of the input item:
  `file: (item) => item.binary.data`. The build stores the key `data`.
  Do not use `expr()`, `$('Node')` or a text key there.
- The step that makes a file sets its key. The type of `item.binary` names
  the keys, so a wrong key is a type error:
  - `httpRequest.download`: `data`.
  - A webhook: a multipart file is under its form field name, a binary or
    raw body under `data`.
  - A form: a file is under its field name. A character that is not a
    letter, digit or `_` becomes `_`.
  - Gmail with `simplify: false` and `downloadAttachments: true`:
    `attachment_0`, `attachment_1`, ….
- `set` and an action that outputs an API response make new items without
  the files. Put the step that reads a file right after the step that makes
  it, or after `when`, `filter`, `switchOn` or `forEach`: they pass the
  items on with their files.
