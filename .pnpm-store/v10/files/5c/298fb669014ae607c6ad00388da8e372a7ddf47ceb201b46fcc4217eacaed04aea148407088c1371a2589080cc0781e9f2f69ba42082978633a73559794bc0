/*
Language: PowerShell
Description: PowerShell is a task-based command-line shell and scripting language built on .NET.
Author: David Mohundro <david@mohundro.com>
Contributors: Nicholas Blumhardt <nblumhardt@nblumhardt.com>, Victor Zhou <OiCMudkips@users.noreply.github.com>, Nicolas Le Gall <contact@nlegall.fr>
Website: https://docs.microsoft.com/en-us/powershell/
*/

function powershell(hljs) {
  const TYPES = [
    "string",
    "char",
    "byte",
    "int",
    "long",
    "bool",
    "decimal",
    "single",
    "double",
    "DateTime",
    "xml",
    "array",
    "hashtable",
    "void"
  ];

  // https://docs.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands
  const VALID_VERBS =
    'Add|Clear|Close|Copy|Enter|Exit|Find|Format|Get|Hide|Join|Lock|'
    + 'Move|New|Open|Optimize|Pop|Push|Redo|Remove|Rename|Reset|Resize|'
    + 'Search|Select|Set|Show|Skip|Split|Step|Switch|Undo|Unlock|'
    + 'Watch|Backup|Checkpoint|Compare|Compress|Convert|ConvertFrom|'
    + 'ConvertTo|Dismount|Edit|Expand|Export|Group|Import|Initialize|'
    + 'Limit|Merge|Mount|Out|Publish|Restore|Save|Sync|Unpublish|Update|'
    + 'Approve|Assert|Build|Complete|Confirm|Deny|Deploy|Disable|Enable|Install|Invoke|'
    + 'Register|Request|Restart|Resume|Start|Stop|Submit|Suspend|Uninstall|'
    + 'Unregister|Wait|Debug|Measure|Ping|Repair|Resolve|Test|Trace|Connect|'
    + 'Disconnect|Read|Receive|Send|Write|Block|Grant|Protect|Revoke|Unblock|'
    + 'Unprotect|Use|ForEach|Sort|Tee|Where';

  const COMPARISON_OPERATORS =
    '-and|-as|-band|-bnot|-bor|-bxor|-casesensitive|-ccontains|-ceq|-cge|-cgt|'
    + '-cle|-clike|-clt|-cmatch|-cne|-cnotcontains|-cnotlike|-cnotmatch|-contains|'
    + '-creplace|-csplit|-eq|-exact|-f|-file|-ge|-gt|-icontains|-ieq|-ige|-igt|'
    + '-ile|-ilike|-ilt|-imatch|-in|-ine|-inotcontains|-inotlike|-inotmatch|'
    + '-ireplace|-is|-isnot|-isplit|-join|-le|-like|-lt|-match|-ne|-not|'
    + '-notcontains|-notin|-notlike|-notmatch|-or|-regex|-replace|-shl|-shr|'
    + '-split|-wildcard|-xor';

  const KEYWORDS = {
    $pattern: /-?[A-z\.\-]+\b/,
    keyword:
      'if else foreach return do while until elseif begin for trap data dynamicparam '
      + 'end break throw param continue finally in switch exit filter try process catch '
      + 'hidden static parameter',
    // "echo" relevance has been set to 0 to avoid auto-detect conflicts with shell transcripts
    built_in:
      'ac asnp cat cd CFS chdir clc clear clhy cli clp cls clv cnsn compare copy cp '
      + 'cpi cpp curl cvpa dbp del diff dir dnsn ebp echo|0 epal epcsv epsn erase etsn exsn fc fhx '
      + 'fl ft fw gal gbp gc gcb gci gcm gcs gdr gerr ghy gi gin gjb gl gm gmo gp gps gpv group '
      + 'gsn gsnp gsv gtz gu gv gwmi h history icm iex ihy ii ipal ipcsv ipmo ipsn irm ise iwmi '
      + 'iwr kill lp ls man md measure mi mount move mp mv nal ndr ni nmo npssc nsn nv ogv oh '
      + 'popd ps pushd pwd r rbp rcjb rcsn rd rdr ren ri rjb rm rmdir rmo rni rnp rp rsn rsnp '
      + 'rujb rv rvpa rwmi sajb sal saps sasv sbp sc scb select set shcm si sl sleep sls sort sp '
      + 'spjb spps spsv start stz sujb sv swmi tee trcm type wget where wjb write'
    // TODO: 'validate[A-Z]+' can't work in keywords
  };

  const TITLE_NAME_RE = /\w[\w\d]*((-)[\w\d]+)*/;

  const BACKTICK_ESCAPE = {
    begin: '`[\\s\\S]',
    relevance: 0
  };

  const VAR = {
    className: 'variable',
    variants: [
      { begin: /\$\B/ },
      {
        className: 'keyword',
        begin: /\$this/
      },
      { begin: /\$[\w\d][\w\d_:]*/ }
    ]
  };

  const LITERAL = {
    className: 'literal',
    begin: /\$(null|true|false)\b/
  };

  const QUOTE_STRING = {
    className: "string",
    variants: [
      {
        begin: /"/,
        end: /"/
      },
      {
        begin: /@"/,
        end: /^"@/
      }
    ],
    contains: [
      BACKTICK_ESCAPE,
      VAR,
      {
        className: 'variable',
        begin: /\$[A-z]/,
        end: /[^A-z]/
      }
    ]
  };

  const APOS_STRING = {
    className: 'string',
    variants: [
      {
        begin: /'/,
        end: /'/
      },
      {
        begin: /@'/,
        end: /^'@/
      }
    ]
  };

  const PS_HELPTAGS = {
    className: "doctag",
    variants: [
      /* no paramater help tags */
      { begin: /\.(synopsis|description|example|inputs|outputs|notes|link|component|role|functionality)/ },
      /* one parameter help tags */
      { begin: /\.(parameter|forwardhelptargetname|forwardhelpcategory|remotehelprunspace|externalhelp)\s+\S+/ }
    ]
  };

  const PS_COMMENT = hljs.inherit(
    hljs.COMMENT(null, null),
    {
      variants: [
        /* single-line comment */
        {
          begin: /#/,
          end: /$/
        },
        /* multi-line comment */
        {
          begin: /<#/,
          end: /#>/
        }
      ],
      contains: [ PS_HELPTAGS ]
    }
  );

  const CMDLETS = {
    className: 'built_in',
    variants: [ { begin: '('.concat(VALID_VERBS, ')+(-)[\\w\\d]+') } ]
  };

  const PS_CLASS = {
    className: 'class',
    beginKeywords: 'class enum',
    end: /\s*[{]/,
    excludeEnd: true,
    relevance: 0,
    contains: [ hljs.TITLE_MODE ]
  };

  const PS_FUNCTION = {
    className: 'function',
    begin: /function\s+/,
    end: /\s*\{|$/,
    excludeEnd: true,
    returnBegin: true,
    relevance: 0,
    contains: [
      {
        begin: "function",
        relevance: 0,
        className: "keyword"
      },
      {
        className: "title",
        begin: TITLE_NAME_RE,
        relevance: 0
      },
      {
        begin: /\(/,
        end: /\)/,
        className: "params",
        relevance: 0,
        contains: [ VAR ]
      }
      // CMDLETS
    ]
  };

  // Using statment, plus type, plus assembly name.
  const PS_USING = {
    begin: /using\s/,
    end: /$/,
    returnBegin: true,
    contains: [
      QUOTE_STRING,
      APOS_STRING,
      {
        className: 'keyword',
        begin: /(using|assembly|command|module|namespace|type)/
      }
    ]
  };

  // Comperison operators & function named parameters.
  const PS_ARGUMENTS = { variants: [
    // PS literals are pretty verbose so it's a good idea to accent them a bit.
    {
      className: 'operator',
      begin: '('.concat(COMPARISON_OPERATORS, ')\\b')
    },
    {
      className: 'literal',
      begin: /(-){1,2}[\w\d-]+/,
      relevance: 0
    }
  ] };

  const HASH_SIGNS = {
    className: 'selector-tag',
    begin: /@\B/,
    relevance: 0
  };

  // It's a very general rule so I'll narrow it a bit with some strict boundaries
  // to avoid any possible false-positive collisions!
  const PS_METHODS = {
    className: 'function',
    begin: /\[.*\]\s*[\w]+[ ]??\(/,
    end: /$/,
    returnBegin: true,
    relevance: 0,
    contains: [
      {
        className: 'keyword',
        begin: '('.concat(
          KEYWORDS.keyword.toString().replace(/\s/g, '|'
          ), ')\\b'),
        endsParent: true,
        relevance: 0
      },
      hljs.inherit(hljs.TITLE_MODE, { endsParent: true })
    ]
  };

  const GENTLEMANS_SET = [
    // STATIC_MEMBER,
    PS_METHODS,
    PS_COMMENT,
    BACKTICK_ESCAPE,
    hljs.NUMBER_MODE,
    QUOTE_STRING,
    APOS_STRING,
    // PS_NEW_OBJECT_TYPE,
    CMDLETS,
    VAR,
    LITERAL,
    HASH_SIGNS
  ];

  const PS_TYPE = {
    begin: /\[/,
    end: /\]/,
    excludeBegin: true,
    excludeEnd: true,
    relevance: 0,
    contains: [].concat(
      'self',
      GENTLEMANS_SET,
      {
        begin: "(" + TYPES.join("|") + ")",
        className: "built_in",
        relevance: 0
      },
      {
        className: 'type',
        begin: /[\.\w\d]+/,
        relevance: 0
      }
    )
  };

  PS_METHODS.contains.unshift(PS_TYPE);

  return {
    name: 'PowerShell',
    aliases: [
      "pwsh",
      "ps",
      "ps1"
    ],
    case_insensitive: true,
    keywords: KEYWORDS,
    contains: GENTLEMANS_SET.concat(
      PS_CLASS,
      PS_FUNCTION,
      PS_USING,
      PS_ARGUMENTS,
      PS_TYPE
    )
  };
}

export { powershell as default };
