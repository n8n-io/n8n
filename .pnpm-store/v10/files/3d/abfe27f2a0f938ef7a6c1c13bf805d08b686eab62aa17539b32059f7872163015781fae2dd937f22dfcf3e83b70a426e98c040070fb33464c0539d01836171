/*
Language: Perl
Author: Peter Leonov <gojpeg@yandex.ru>
Website: https://www.perl.org
Category: common
*/

/** @type LanguageFn */
function perl(hljs) {
  const regex = hljs.regex;
  const KEYWORDS = [
    'abs',
    'accept',
    'alarm',
    'and',
    'atan2',
    'bind',
    'binmode',
    'bless',
    'break',
    'caller',
    'chdir',
    'chmod',
    'chomp',
    'chop',
    'chown',
    'chr',
    'chroot',
    'close',
    'closedir',
    'connect',
    'continue',
    'cos',
    'crypt',
    'dbmclose',
    'dbmopen',
    'defined',
    'delete',
    'die',
    'do',
    'dump',
    'each',
    'else',
    'elsif',
    'endgrent',
    'endhostent',
    'endnetent',
    'endprotoent',
    'endpwent',
    'endservent',
    'eof',
    'eval',
    'exec',
    'exists',
    'exit',
    'exp',
    'fcntl',
    'fileno',
    'flock',
    'for',
    'foreach',
    'fork',
    'format',
    'formline',
    'getc',
    'getgrent',
    'getgrgid',
    'getgrnam',
    'gethostbyaddr',
    'gethostbyname',
    'gethostent',
    'getlogin',
    'getnetbyaddr',
    'getnetbyname',
    'getnetent',
    'getpeername',
    'getpgrp',
    'getpriority',
    'getprotobyname',
    'getprotobynumber',
    'getprotoent',
    'getpwent',
    'getpwnam',
    'getpwuid',
    'getservbyname',
    'getservbyport',
    'getservent',
    'getsockname',
    'getsockopt',
    'given',
    'glob',
    'gmtime',
    'goto',
    'grep',
    'gt',
    'hex',
    'if',
    'index',
    'int',
    'ioctl',
    'join',
    'keys',
    'kill',
    'last',
    'lc',
    'lcfirst',
    'length',
    'link',
    'listen',
    'local',
    'localtime',
    'log',
    'lstat',
    'lt',
    'ma',
    'map',
    'mkdir',
    'msgctl',
    'msgget',
    'msgrcv',
    'msgsnd',
    'my',
    'ne',
    'next',
    'no',
    'not',
    'oct',
    'open',
    'opendir',
    'or',
    'ord',
    'our',
    'pack',
    'package',
    'pipe',
    'pop',
    'pos',
    'print',
    'printf',
    'prototype',
    'push',
    'q|0',
    'qq',
    'quotemeta',
    'qw',
    'qx',
    'rand',
    'read',
    'readdir',
    'readline',
    'readlink',
    'readpipe',
    'recv',
    'redo',
    'ref',
    'rename',
    'require',
    'reset',
    'return',
    'reverse',
    'rewinddir',
    'rindex',
    'rmdir',
    'say',
    'scalar',
    'seek',
    'seekdir',
    'select',
    'semctl',
    'semget',
    'semop',
    'send',
    'setgrent',
    'sethostent',
    'setnetent',
    'setpgrp',
    'setpriority',
    'setprotoent',
    'setpwent',
    'setservent',
    'setsockopt',
    'shift',
    'shmctl',
    'shmget',
    'shmread',
    'shmwrite',
    'shutdown',
    'sin',
    'sleep',
    'socket',
    'socketpair',
    'sort',
    'splice',
    'split',
    'sprintf',
    'sqrt',
    'srand',
    'stat',
    'state',
    'study',
    'sub',
    'substr',
    'symlink',
    'syscall',
    'sysopen',
    'sysread',
    'sysseek',
    'system',
    'syswrite',
    'tell',
    'telldir',
    'tie',
    'tied',
    'time',
    'times',
    'tr',
    'truncate',
    'uc',
    'ucfirst',
    'umask',
    'undef',
    'unless',
    'unlink',
    'unpack',
    'unshift',
    'untie',
    'until',
    'use',
    'utime',
    'values',
    'vec',
    'wait',
    'waitpid',
    'wantarray',
    'warn',
    'when',
    'while',
    'write',
    'x|0',
    'xor',
    'y|0'
  ];

  // https://perldoc.perl.org/perlre#Modifiers
  const REGEX_MODIFIERS = /[dualxmsipngr]{0,12}/; // aa and xx are valid, making max length 12
  const PERL_KEYWORDS = {
    $pattern: /[\w.]+/,
    keyword: KEYWORDS.join(" ")
  };
  const SUBST = {
    className: 'subst',
    begin: '[$@]\\{',
    end: '\\}',
    keywords: PERL_KEYWORDS
  };
  const METHOD = {
    begin: /->\{/,
    end: /\}/
    // contains defined later
  };
  const VAR = { variants: [
    { begin: /\$\d/ },
    { begin: regex.concat(
      /[$%@](\^\w\b|#\w+(::\w+)*|\{\w+\}|\w+(::\w*)*)/,
      // negative look-ahead tries to avoid matching patterns that are not
      // Perl at all like $ident$, @ident@, etc.
      `(?![A-Za-z])(?![@$%])`
    ) },
    {
      begin: /[$%@][^\s\w{]/,
      relevance: 0
    }
  ] };
  const STRING_CONTAINS = [
    hljs.BACKSLASH_ESCAPE,
    SUBST,
    VAR
  ];
  const REGEX_DELIMS = [
    /!/,
    /\//,
    /\|/,
    /\?/,
    /'/,
    /"/, // valid but infrequent and weird
    /#/ // valid but infrequent and weird
  ];
  /**
   * @param {string|RegExp} prefix
   * @param {string|RegExp} open
   * @param {string|RegExp} close
   */
  const PAIRED_DOUBLE_RE = (prefix, open, close = '\\1') => {
    const middle = (close === '\\1')
      ? close
      : regex.concat(close, open);
    return regex.concat(
      regex.concat("(?:", prefix, ")"),
      open,
      /(?:\\.|[^\\\/])*?/,
      middle,
      /(?:\\.|[^\\\/])*?/,
      close,
      REGEX_MODIFIERS
    );
  };
  /**
   * @param {string|RegExp} prefix
   * @param {string|RegExp} open
   * @param {string|RegExp} close
   */
  const PAIRED_RE = (prefix, open, close) => {
    return regex.concat(
      regex.concat("(?:", prefix, ")"),
      open,
      /(?:\\.|[^\\\/])*?/,
      close,
      REGEX_MODIFIERS
    );
  };
  const PERL_DEFAULT_CONTAINS = [
    VAR,
    hljs.HASH_COMMENT_MODE,
    hljs.COMMENT(
      /^=\w/,
      /=cut/,
      { endsWithParent: true }
    ),
    METHOD,
    {
      className: 'string',
      contains: STRING_CONTAINS,
      variants: [
        {
          begin: 'q[qwxr]?\\s*\\(',
          end: '\\)',
          relevance: 5
        },
        {
          begin: 'q[qwxr]?\\s*\\[',
          end: '\\]',
          relevance: 5
        },
        {
          begin: 'q[qwxr]?\\s*\\{',
          end: '\\}',
          relevance: 5
        },
        {
          begin: 'q[qwxr]?\\s*\\|',
          end: '\\|',
          relevance: 5
        },
        {
          begin: 'q[qwxr]?\\s*<',
          end: '>',
          relevance: 5
        },
        {
          begin: 'qw\\s+q',
          end: 'q',
          relevance: 5
        },
        {
          begin: '\'',
          end: '\'',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: '"',
          end: '"'
        },
        {
          begin: '`',
          end: '`',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: /\{\w+\}/,
          relevance: 0
        },
        {
          begin: '-?\\w+\\s*=>',
          relevance: 0
        }
      ]
    },
    {
      className: 'number',
      begin: '(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',
      relevance: 0
    },
    { // regexp container
      begin: '(\\/\\/|' + hljs.RE_STARTERS_RE + '|\\b(split|return|print|reverse|grep)\\b)\\s*',
      keywords: 'split return print reverse grep',
      relevance: 0,
      contains: [
        hljs.HASH_COMMENT_MODE,
        {
          className: 'regexp',
          variants: [
            // allow matching common delimiters
            { begin: PAIRED_DOUBLE_RE("s|tr|y", regex.either(...REGEX_DELIMS, { capture: true })) },
            // and then paired delmis
            { begin: PAIRED_DOUBLE_RE("s|tr|y", "\\(", "\\)") },
            { begin: PAIRED_DOUBLE_RE("s|tr|y", "\\[", "\\]") },
            { begin: PAIRED_DOUBLE_RE("s|tr|y", "\\{", "\\}") }
          ],
          relevance: 2
        },
        {
          className: 'regexp',
          variants: [
            {
              // could be a comment in many languages so do not count
              // as relevant
              begin: /(m|qr)\/\//,
              relevance: 0
            },
            // prefix is optional with /regex/
            { begin: PAIRED_RE("(?:m|qr)?", /\//, /\//) },
            // allow matching common delimiters
            { begin: PAIRED_RE("m|qr", regex.either(...REGEX_DELIMS, { capture: true }), /\1/) },
            // allow common paired delmins
            { begin: PAIRED_RE("m|qr", /\(/, /\)/) },
            { begin: PAIRED_RE("m|qr", /\[/, /\]/) },
            { begin: PAIRED_RE("m|qr", /\{/, /\}/) }
          ]
        }
      ]
    },
    {
      className: 'function',
      beginKeywords: 'sub',
      end: '(\\s*\\(.*?\\))?[;{]',
      excludeEnd: true,
      relevance: 5,
      contains: [ hljs.TITLE_MODE ]
    },
    {
      begin: '-\\w\\b',
      relevance: 0
    },
    {
      begin: "^__DATA__$",
      end: "^__END__$",
      subLanguage: 'mojolicious',
      contains: [
        {
          begin: "^@@.*",
          end: "$",
          className: "comment"
        }
      ]
    }
  ];
  SUBST.contains = PERL_DEFAULT_CONTAINS;
  METHOD.contains = PERL_DEFAULT_CONTAINS;

  return {
    name: 'Perl',
    aliases: [
      'pl',
      'pm'
    ],
    keywords: PERL_KEYWORDS,
    contains: PERL_DEFAULT_CONTAINS
  };
}

module.exports = perl;
