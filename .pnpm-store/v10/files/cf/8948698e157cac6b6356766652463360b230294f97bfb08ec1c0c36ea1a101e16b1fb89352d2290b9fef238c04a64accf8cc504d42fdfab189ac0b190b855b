/*
Language: Hy
Description: Hy is a wonderful dialect of Lisp that’s embedded in Python.
Author: Sergey Sobko <s.sobko@profitware.ru>
Website: http://docs.hylang.org/en/stable/
Category: lisp
*/

function hy(hljs) {
  const SYMBOLSTART = 'a-zA-Z_\\-!.?+*=<>&#\'';
  const SYMBOL_RE = '[' + SYMBOLSTART + '][' + SYMBOLSTART + '0-9/;:]*';
  const keywords = {
    $pattern: SYMBOL_RE,
    built_in:
      // keywords
      '!= % %= & &= * ** **= *= *map '
      + '+ += , --build-class-- --import-- -= . / // //= '
      + '/= < << <<= <= = > >= >> >>= '
      + '@ @= ^ ^= abs accumulate all and any ap-compose '
      + 'ap-dotimes ap-each ap-each-while ap-filter ap-first ap-if ap-last ap-map ap-map-when ap-pipe '
      + 'ap-reduce ap-reject apply as-> ascii assert assoc bin break butlast '
      + 'callable calling-module-name car case cdr chain chr coll? combinations compile '
      + 'compress cond cons cons? continue count curry cut cycle dec '
      + 'def default-method defclass defmacro defmacro-alias defmacro/g! defmain defmethod defmulti defn '
      + 'defn-alias defnc defnr defreader defseq del delattr delete-route dict-comp dir '
      + 'disassemble dispatch-reader-macro distinct divmod do doto drop drop-last drop-while empty? '
      + 'end-sequence eval eval-and-compile eval-when-compile even? every? except exec filter first '
      + 'flatten float? fn fnc fnr for for* format fraction genexpr '
      + 'gensym get getattr global globals group-by hasattr hash hex id '
      + 'identity if if* if-not if-python2 import in inc input instance? '
      + 'integer integer-char? integer? interleave interpose is is-coll is-cons is-empty is-even '
      + 'is-every is-float is-instance is-integer is-integer-char is-iterable is-iterator is-keyword is-neg is-none '
      + 'is-not is-numeric is-odd is-pos is-string is-symbol is-zero isinstance islice issubclass '
      + 'iter iterable? iterate iterator? keyword keyword? lambda last len let '
      + 'lif lif-not list* list-comp locals loop macro-error macroexpand macroexpand-1 macroexpand-all '
      + 'map max merge-with method-decorator min multi-decorator multicombinations name neg? next '
      + 'none? nonlocal not not-in not? nth numeric? oct odd? open '
      + 'or ord partition permutations pos? post-route postwalk pow prewalk print '
      + 'product profile/calls profile/cpu put-route quasiquote quote raise range read read-str '
      + 'recursive-replace reduce remove repeat repeatedly repr require rest round route '
      + 'route-with-methods rwm second seq set-comp setattr setv some sorted string '
      + 'string? sum switch symbol? take take-nth take-while tee try unless '
      + 'unquote unquote-splicing vars walk when while with with* with-decorator with-gensyms '
      + 'xi xor yield yield-from zero? zip zip-longest | |= ~'
  };

  const SIMPLE_NUMBER_RE = '[-+]?\\d+(\\.\\d+)?';

  const SYMBOL = {
    begin: SYMBOL_RE,
    relevance: 0
  };
  const NUMBER = {
    className: 'number',
    begin: SIMPLE_NUMBER_RE,
    relevance: 0
  };
  const STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null });
  const COMMENT = hljs.COMMENT(
    ';',
    '$',
    { relevance: 0 }
  );
  const LITERAL = {
    className: 'literal',
    begin: /\b([Tt]rue|[Ff]alse|nil|None)\b/
  };
  const COLLECTION = {
    begin: '[\\[\\{]',
    end: '[\\]\\}]',
    relevance: 0
  };
  const HINT = {
    className: 'comment',
    begin: '\\^' + SYMBOL_RE
  };
  const HINT_COL = hljs.COMMENT('\\^\\{', '\\}');
  const KEY = {
    className: 'symbol',
    begin: '[:]{1,2}' + SYMBOL_RE
  };
  const LIST = {
    begin: '\\(',
    end: '\\)'
  };
  const BODY = {
    endsWithParent: true,
    relevance: 0
  };
  const NAME = {
    className: 'name',
    relevance: 0,
    keywords: keywords,
    begin: SYMBOL_RE,
    starts: BODY
  };
  const DEFAULT_CONTAINS = [
    LIST,
    STRING,
    HINT,
    HINT_COL,
    COMMENT,
    KEY,
    COLLECTION,
    NUMBER,
    LITERAL,
    SYMBOL
  ];

  LIST.contains = [
    hljs.COMMENT('comment', ''),
    NAME,
    BODY
  ];
  BODY.contains = DEFAULT_CONTAINS;
  COLLECTION.contains = DEFAULT_CONTAINS;

  return {
    name: 'Hy',
    aliases: [ 'hylang' ],
    illegal: /\S/,
    contains: [
      hljs.SHEBANG(),
      LIST,
      STRING,
      HINT,
      HINT_COL,
      COMMENT,
      KEY,
      COLLECTION,
      NUMBER,
      LITERAL
    ]
  };
}

module.exports = hy;
