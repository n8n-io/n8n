/*
Language: Vala
Author: Antono Vasiljev <antono.vasiljev@gmail.com>
Description: Vala is a new programming language that aims to bring modern programming language features to GNOME developers without imposing any additional runtime requirements and without using a different ABI compared to applications and libraries written in C.
Website: https://wiki.gnome.org/Projects/Vala
Category: system
*/

function vala(hljs) {
  return {
    name: 'Vala',
    keywords: {
      keyword:
        // Value types
        'char uchar unichar int uint long ulong short ushort int8 int16 int32 int64 uint8 '
        + 'uint16 uint32 uint64 float double bool struct enum string void '
        // Reference types
        + 'weak unowned owned '
        // Modifiers
        + 'async signal static abstract interface override virtual delegate '
        // Control Structures
        + 'if while do for foreach else switch case break default return try catch '
        // Visibility
        + 'public private protected internal '
        // Other
        + 'using new this get set const stdout stdin stderr var',
      built_in:
        'DBus GLib CCode Gee Object Gtk Posix',
      literal:
        'false true null'
    },
    contains: [
      {
        className: 'class',
        beginKeywords: 'class interface namespace',
        end: /\{/,
        excludeEnd: true,
        illegal: '[^,:\\n\\s\\.]',
        contains: [ hljs.UNDERSCORE_TITLE_MODE ]
      },
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'string',
        begin: '"""',
        end: '"""',
        relevance: 5
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'meta',
        begin: '^#',
        end: '$',
      }
    ]
  };
}

module.exports = vala;
