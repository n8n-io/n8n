/*
Language: Smali
Author: Dennis Titze <dennis.titze@gmail.com>
Description: Basic Smali highlighting
Website: https://github.com/JesusFreke/smali
Category: assembler
*/

function smali(hljs) {
  const smali_instr_low_prio = [
    'add',
    'and',
    'cmp',
    'cmpg',
    'cmpl',
    'const',
    'div',
    'double',
    'float',
    'goto',
    'if',
    'int',
    'long',
    'move',
    'mul',
    'neg',
    'new',
    'nop',
    'not',
    'or',
    'rem',
    'return',
    'shl',
    'shr',
    'sput',
    'sub',
    'throw',
    'ushr',
    'xor'
  ];
  const smali_instr_high_prio = [
    'aget',
    'aput',
    'array',
    'check',
    'execute',
    'fill',
    'filled',
    'goto/16',
    'goto/32',
    'iget',
    'instance',
    'invoke',
    'iput',
    'monitor',
    'packed',
    'sget',
    'sparse'
  ];
  const smali_keywords = [
    'transient',
    'constructor',
    'abstract',
    'final',
    'synthetic',
    'public',
    'private',
    'protected',
    'static',
    'bridge',
    'system'
  ];
  return {
    name: 'Smali',
    contains: [
      {
        className: 'string',
        begin: '"',
        end: '"',
        relevance: 0
      },
      hljs.COMMENT(
        '#',
        '$',
        { relevance: 0 }
      ),
      {
        className: 'keyword',
        variants: [
          { begin: '\\s*\\.end\\s[a-zA-Z0-9]*' },
          {
            begin: '^[ ]*\\.[a-zA-Z]*',
            relevance: 0
          },
          {
            begin: '\\s:[a-zA-Z_0-9]*',
            relevance: 0
          },
          { begin: '\\s(' + smali_keywords.join('|') + ')' }
        ]
      },
      {
        className: 'built_in',
        variants: [
          { begin: '\\s(' + smali_instr_low_prio.join('|') + ')\\s' },
          {
            begin: '\\s(' + smali_instr_low_prio.join('|') + ')((-|/)[a-zA-Z0-9]+)+\\s',
            relevance: 10
          },
          {
            begin: '\\s(' + smali_instr_high_prio.join('|') + ')((-|/)[a-zA-Z0-9]+)*\\s',
            relevance: 10
          }
        ]
      },
      {
        className: 'class',
        begin: 'L[^\(;:\n]*;',
        relevance: 0
      },
      { begin: '[vp][0-9]+' }
    ]
  };
}

module.exports = smali;
