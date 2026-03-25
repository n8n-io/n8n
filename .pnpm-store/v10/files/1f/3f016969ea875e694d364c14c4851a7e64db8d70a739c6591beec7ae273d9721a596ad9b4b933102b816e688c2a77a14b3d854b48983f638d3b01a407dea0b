/*
Language: SML (Standard ML)
Author: Edwin Dalorzo <edwin@dalorzo.org>
Description: SML language definition.
Website: https://www.smlnj.org
Origin: ocaml.js
Category: functional
*/
function sml(hljs) {
  return {
    name: 'SML (Standard ML)',
    aliases: [ 'ml' ],
    keywords: {
      $pattern: '[a-z_]\\w*!?',
      keyword:
        /* according to Definition of Standard ML 97  */
        'abstype and andalso as case datatype do else end eqtype '
        + 'exception fn fun functor handle if in include infix infixr '
        + 'let local nonfix of op open orelse raise rec sharing sig '
        + 'signature struct structure then type val with withtype where while',
      built_in:
        /* built-in types according to basis library */
        'array bool char exn int list option order real ref string substring vector unit word',
      literal:
        'true false NONE SOME LESS EQUAL GREATER nil'
    },
    illegal: /\/\/|>>/,
    contains: [
      {
        className: 'literal',
        begin: /\[(\|\|)?\]|\(\)/,
        relevance: 0
      },
      hljs.COMMENT(
        '\\(\\*',
        '\\*\\)',
        { contains: [ 'self' ] }
      ),
      { /* type variable */
        className: 'symbol',
        begin: '\'[A-Za-z_](?!\')[\\w\']*'
        /* the grammar is ambiguous on how 'a'b should be interpreted but not the compiler */
      },
      { /* polymorphic variant */
        className: 'type',
        begin: '`[A-Z][\\w\']*'
      },
      { /* module or constructor */
        className: 'type',
        begin: '\\b[A-Z][\\w\']*',
        relevance: 0
      },
      { /* don't color identifiers, but safely catch all identifiers with ' */
        begin: '[a-z_]\\w*\'[\\w\']*' },
      hljs.inherit(hljs.APOS_STRING_MODE, {
        className: 'string',
        relevance: 0
      }),
      hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null }),
      {
        className: 'number',
        begin:
          '\\b(0[xX][a-fA-F0-9_]+[Lln]?|'
          + '0[oO][0-7_]+[Lln]?|'
          + '0[bB][01_]+[Lln]?|'
          + '[0-9][0-9_]*([Lln]|(\\.[0-9_]*)?([eE][-+]?[0-9_]+)?)?)',
        relevance: 0
      },
      { begin: /[-=]>/ // relevance booster
      }
    ]
  };
}

module.exports = sml;
