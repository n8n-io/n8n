

type ArrayBracketNewlineSchema0
  = | ('always' | 'never' | 'consistent')
    | {
      multiline?: boolean
      minItems?: number | null
    }

type ArrayBracketNewlineRuleOptions = [
  ArrayBracketNewlineSchema0?,
]

type ArrayBracketSpacingSchema0 = 'always' | 'never'

interface ArrayBracketSpacingSchema1 {
  singleValue?: boolean
  objectsInArrays?: boolean
  arraysInArrays?: boolean
}

type ArrayBracketSpacingRuleOptions = [
  ArrayBracketSpacingSchema0?,
  ArrayBracketSpacingSchema1?,
]

type ArrayElementNewlineSchema0
  = | []
    | [
      | BasicConfig$1
      | {
        ArrayExpression?: BasicConfig$1
        ArrayPattern?: BasicConfig$1
      },
    ]
type BasicConfig$1
  = | ('always' | 'never' | 'consistent')
    | {
      consistent?: boolean
      multiline?: boolean
      minItems?: number | null
    }

type ArrayElementNewlineRuleOptions
  = ArrayElementNewlineSchema0

type ArrowParensSchema0 = 'always' | 'as-needed'

interface ArrowParensSchema1 {
  requireForBlockBody?: boolean
}

type ArrowParensRuleOptions = [
  ArrowParensSchema0?,
  ArrowParensSchema1?,
]

interface ArrowSpacingSchema0 {
  before?: boolean
  after?: boolean
}

type ArrowSpacingRuleOptions = [ArrowSpacingSchema0?]

type BlockSpacingSchema0 = 'always' | 'never'

type BlockSpacingRuleOptions = [BlockSpacingSchema0?]

type BraceStyleSchema0
  = | '1tbs'
    | 'stroustrup'
    | 'allman'

interface BraceStyleSchema1 {
  allowSingleLine?: boolean
}

type BraceStyleRuleOptions = [
  BraceStyleSchema0?,
  BraceStyleSchema1?,
]

type CommaDangleSchema0
  = | []
    | [
      | Value
      | {
        arrays?: ValueWithIgnore
        objects?: ValueWithIgnore
        imports?: ValueWithIgnore
        exports?: ValueWithIgnore
        functions?: ValueWithIgnore
        importAttributes?: ValueWithIgnore
        dynamicImports?: ValueWithIgnore
        enums?: ValueWithIgnore
        generics?: ValueWithIgnore
        tuples?: ValueWithIgnore
      },
    ]
type Value
  = | 'always-multiline'
    | 'always'
    | 'never'
    | 'only-multiline'
type ValueWithIgnore
  = | 'always-multiline'
    | 'always'
    | 'never'
    | 'only-multiline'
    | 'ignore'

type CommaDangleRuleOptions = CommaDangleSchema0

interface CommaSpacingSchema0 {
  before?: boolean
  after?: boolean
}

type CommaSpacingRuleOptions = [CommaSpacingSchema0?]

type CommaStyleSchema0 = 'first' | 'last'

interface CommaStyleSchema1 {
  exceptions?: {
    [k: string]: boolean
  }
}

type CommaStyleRuleOptions = [
  CommaStyleSchema0?,
  CommaStyleSchema1?,
]

type ComputedPropertySpacingSchema0
  = | 'always'
    | 'never'

interface ComputedPropertySpacingSchema1 {
  enforceForClassMembers?: boolean
}

type ComputedPropertySpacingRuleOptions = [
  ComputedPropertySpacingSchema0?,
  ComputedPropertySpacingSchema1?,
]

type CurlyNewlineSchema0
  = | ('always' | 'never')
    | {
      IfStatementConsequent?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      IfStatementAlternative?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      DoWhileStatement?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      ForInStatement?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      ForOfStatement?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      ForStatement?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      WhileStatement?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      SwitchStatement?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      SwitchCase?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      TryStatementBlock?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      TryStatementHandler?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      TryStatementFinalizer?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      BlockStatement?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      ArrowFunctionExpression?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      FunctionDeclaration?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      FunctionExpression?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      Property?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      ClassBody?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      StaticBlock?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      WithStatement?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      TSModuleBlock?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minElements?: number
          consistent?: boolean
        }
      multiline?: boolean
      minElements?: number
      consistent?: boolean
    }

type CurlyNewlineRuleOptions = [CurlyNewlineSchema0?]

type DotLocationSchema0 = 'object' | 'property'

type DotLocationRuleOptions = [DotLocationSchema0?]

type EolLastSchema0
  = | 'always'
    | 'never'
    | 'unix'
    | 'windows'

type EolLastRuleOptions = [EolLastSchema0?]

type FunctionCallArgumentNewlineSchema0
  = | 'always'
    | 'never'
    | 'consistent'

type FunctionCallArgumentNewlineRuleOptions = [
  FunctionCallArgumentNewlineSchema0?,
]

type FunctionCallSpacingSchema0
  = | []
    | ['never']
    | []
    | ['always']
    | [
      'always',
      {
        allowNewlines?: boolean
        optionalChain?: {
          before?: boolean
          after?: boolean
        }
      },
    ]

type FunctionCallSpacingRuleOptions
  = FunctionCallSpacingSchema0

type FunctionParenNewlineSchema0
  = | (
    | 'always'
    | 'never'
    | 'consistent'
    | 'multiline'
    | 'multiline-arguments'
    )
    | {
      minItems?: number
    }

type FunctionParenNewlineRuleOptions = [
  FunctionParenNewlineSchema0?,
]

type GeneratorStarSpacingSchema0
  = | ('before' | 'after' | 'both' | 'neither')
    | {
      before?: boolean
      after?: boolean
      named?:
        | ('before' | 'after' | 'both' | 'neither')
        | {
          before?: boolean
          after?: boolean
        }
      anonymous?:
        | ('before' | 'after' | 'both' | 'neither')
        | {
          before?: boolean
          after?: boolean
        }
      method?:
        | ('before' | 'after' | 'both' | 'neither')
        | {
          before?: boolean
          after?: boolean
        }
    }

type GeneratorStarSpacingRuleOptions = [
  GeneratorStarSpacingSchema0?,
]

type ImplicitArrowLinebreakSchema0
  = | 'beside'
    | 'below'

type ImplicitArrowLinebreakRuleOptions = [
  ImplicitArrowLinebreakSchema0?,
]

type IndentBinaryOpsSchema0 = number | 'tab'

type IndentBinaryOpsRuleOptions = [
  IndentBinaryOpsSchema0?,
]

type IndentSchema0 = 'tab' | number

interface IndentSchema1 {
  SwitchCase?: number
  VariableDeclarator?:
    | (number | ('first' | 'off'))
    | {
      var?: number | ('first' | 'off')
      let?: number | ('first' | 'off')
      const?: number | ('first' | 'off')
      using?: number | ('first' | 'off')
    }
  outerIIFEBody?: number | 'off'
  MemberExpression?: number | 'off'
  FunctionDeclaration?: {
    parameters?: number | ('first' | 'off')
    body?: number
  }
  FunctionExpression?: {
    parameters?: number | ('first' | 'off')
    body?: number
  }
  StaticBlock?: {
    body?: number
  }
  CallExpression?: {
    arguments?: number | ('first' | 'off')
  }
  ArrayExpression?: number | ('first' | 'off')
  ObjectExpression?: number | ('first' | 'off')
  ImportDeclaration?: number | ('first' | 'off')
  flatTernaryExpressions?: boolean
  offsetTernaryExpressions?: boolean
  offsetTernaryExpressionsOffsetCallExpressions?: boolean
  ignoredNodes?: string[]
  ignoreComments?: boolean
  tabLength?: number
}

type IndentRuleOptions = [
  IndentSchema0?,
  IndentSchema1?,
]

type JsxChildElementSpacingRuleOptions = []

type JsxClosingBracketLocationSchema0
  = | (
    | 'after-props'
    | 'props-aligned'
    | 'tag-aligned'
    | 'line-aligned'
    )
    | {
      location?:
        | 'after-props'
        | 'props-aligned'
        | 'tag-aligned'
        | 'line-aligned'
    }
    | {
      nonEmpty?:
        | (
          | 'after-props'
          | 'props-aligned'
          | 'tag-aligned'
          | 'line-aligned'
          )
          | false
      selfClosing?:
        | (
          | 'after-props'
          | 'props-aligned'
          | 'tag-aligned'
          | 'line-aligned'
          )
          | false
    }

type JsxClosingBracketLocationRuleOptions = [
  JsxClosingBracketLocationSchema0?,
]

type JsxClosingTagLocationSchema0
  = | 'tag-aligned'
    | 'line-aligned'

type JsxClosingTagLocationRuleOptions = [
  JsxClosingTagLocationSchema0?,
]

type JsxCurlyBracePresenceSchema0
  = | {
    props?: 'always' | 'never' | 'ignore'
    children?: 'always' | 'never' | 'ignore'
    propElementValues?: 'always' | 'never' | 'ignore'
  }
  | ('always' | 'never' | 'ignore')

type JsxCurlyBracePresenceRuleOptions = [
  JsxCurlyBracePresenceSchema0?,
]

type JsxCurlyNewlineSchema0
  = | ('consistent' | 'never')
    | {
      singleline?: 'consistent' | 'require' | 'forbid'
      multiline?: 'consistent' | 'require' | 'forbid'
    }

type JsxCurlyNewlineRuleOptions = [
  JsxCurlyNewlineSchema0?,
]

type JsxCurlySpacingSchema0
  = | []
    | [
      | (BasicConfig & {
        attributes?: BasicConfigOrBoolean
        children?: BasicConfigOrBoolean
        [k: string]: unknown
      })
      | ('always' | 'never'),
    ]
    | [
      (
        | (BasicConfig & {
          attributes?: BasicConfigOrBoolean
          children?: BasicConfigOrBoolean
          [k: string]: unknown
        })
        | ('always' | 'never')
      ),
      {
        allowMultiline?: boolean
        spacing?: {
          objectLiterals?: 'always' | 'never'
          [k: string]: unknown
        }
      },
    ]
type BasicConfigOrBoolean = BasicConfig | boolean

interface BasicConfig {
  when?: 'always' | 'never'
  allowMultiline?: boolean
  spacing?: {
    objectLiterals?: 'always' | 'never'
    [k: string]: unknown
  }
  [k: string]: unknown
}

type JsxCurlySpacingRuleOptions
  = JsxCurlySpacingSchema0

type JsxEqualsSpacingSchema0 = 'always' | 'never'

type JsxEqualsSpacingRuleOptions = [
  JsxEqualsSpacingSchema0?,
]

type JsxFirstPropNewLineSchema0
  = | 'always'
    | 'never'
    | 'multiline'
    | 'multiline-multiprop'
    | 'multiprop'

type JsxFirstPropNewLineRuleOptions = [
  JsxFirstPropNewLineSchema0?,
]

type JsxFunctionCallNewlineSchema0
  = | 'always'
    | 'multiline'

type JsxFunctionCallNewlineRuleOptions = [
  JsxFunctionCallNewlineSchema0?,
]

type JsxIndentPropsSchema0
  = | ('tab' | 'first')
    | number
    | {
      indentMode?: ('tab' | 'first') | number
      ignoreTernaryOperator?: boolean
      [k: string]: unknown
    }

type JsxIndentPropsRuleOptions = [
  JsxIndentPropsSchema0?,
]

type JsxIndentSchema0 = 'tab' | number

interface JsxIndentSchema1 {
  checkAttributes?: boolean
  indentLogicalExpressions?: boolean
}

type JsxIndentRuleOptions = [
  JsxIndentSchema0?,
  JsxIndentSchema1?,
]

type JsxMaxPropsPerLineSchema0
  = | {
    maximum?: {
      single?: number
      multi?: number
      [k: string]: unknown
    }
  }
  | {
    maximum?: number
    when?: 'always' | 'multiline'
  }

type JsxMaxPropsPerLineRuleOptions = [
  JsxMaxPropsPerLineSchema0?,
]

interface JsxNewlineSchema0 {
  prevent?: boolean
  allowMultilines?: boolean
}

type JsxNewlineRuleOptions = [JsxNewlineSchema0?]

interface JsxOneExpressionPerLineSchema0 {
  allow?:
    | 'none'
    | 'literal'
    | 'single-child'
    | 'single-line'
    | 'non-jsx'
}

type JsxOneExpressionPerLineRuleOptions = [
  JsxOneExpressionPerLineSchema0?,
]

interface JsxPascalCaseSchema0 {
  allowAllCaps?: boolean
  allowLeadingUnderscore?: boolean
  allowNamespace?: boolean
  ignore?: string[]
}

type JsxPascalCaseRuleOptions = [
  JsxPascalCaseSchema0?,
]

type JsxPropsNoMultiSpacesRuleOptions = []

type JsxQuotesSchema0
  = | 'prefer-single'
    | 'prefer-double'

type JsxQuotesRuleOptions = [JsxQuotesSchema0?]

interface JsxSelfClosingCompSchema0 {
  component?: boolean
  html?: boolean
}

type JsxSelfClosingCompRuleOptions = [
  JsxSelfClosingCompSchema0?,
]

interface JsxSortPropsSchema0 {
  callbacksLast?: boolean
  shorthandFirst?: boolean
  shorthandLast?: boolean
  multiline?: 'ignore' | 'first' | 'last'
  ignoreCase?: boolean
  noSortAlphabetically?: boolean
  reservedFirst?: string[] | boolean
  reservedLast?: string[]
  locale?: string
}

type JsxSortPropsRuleOptions = [JsxSortPropsSchema0?]

interface JsxTagSpacingSchema0 {
  closingSlash?: 'always' | 'never' | 'allow'
  beforeSelfClosing?:
    | 'always'
    | 'proportional-always'
    | 'never'
    | 'allow'
  afterOpening?:
    | 'always'
    | 'allow-multiline'
    | 'never'
    | 'allow'
  beforeClosing?:
    | 'always'
    | 'proportional-always'
    | 'never'
    | 'allow'
}

type JsxTagSpacingRuleOptions = [
  JsxTagSpacingSchema0?,
]

interface JsxWrapMultilinesSchema0 {
  declaration?:
    | true
    | false
    | 'ignore'
    | 'parens'
    | 'parens-new-line'
  assignment?:
    | true
    | false
    | 'ignore'
    | 'parens'
    | 'parens-new-line'
  return?:
    | true
    | false
    | 'ignore'
    | 'parens'
    | 'parens-new-line'
  arrow?:
    | true
    | false
    | 'ignore'
    | 'parens'
    | 'parens-new-line'
  condition?:
    | true
    | false
    | 'ignore'
    | 'parens'
    | 'parens-new-line'
  logical?:
    | true
    | false
    | 'ignore'
    | 'parens'
    | 'parens-new-line'
  prop?:
    | true
    | false
    | 'ignore'
    | 'parens'
    | 'parens-new-line'
  propertyValue?:
    | true
    | false
    | 'ignore'
    | 'parens'
    | 'parens-new-line'
}

type JsxWrapMultilinesRuleOptions = [
  JsxWrapMultilinesSchema0?,
]

type KeySpacingSchema0
  = | {
    align?:
        | ('colon' | 'value')
        | {
          mode?: 'strict' | 'minimum'
          on?: 'colon' | 'value'
          beforeColon?: boolean
          afterColon?: boolean
        }
    mode?: 'strict' | 'minimum'
    beforeColon?: boolean
    afterColon?: boolean
    ignoredNodes?: (
      | 'ObjectExpression'
      | 'ObjectPattern'
      | 'ImportDeclaration'
      | 'ExportNamedDeclaration'
      | 'ExportAllDeclaration'
      | 'TSTypeLiteral'
      | 'TSInterfaceBody'
      | 'ClassBody'
    )[]
  }
  | {
    singleLine?: {
      mode?: 'strict' | 'minimum'
      beforeColon?: boolean
      afterColon?: boolean
    }
    multiLine?: {
      align?:
          | ('colon' | 'value')
          | {
            mode?: 'strict' | 'minimum'
            on?: 'colon' | 'value'
            beforeColon?: boolean
            afterColon?: boolean
          }
      mode?: 'strict' | 'minimum'
      beforeColon?: boolean
      afterColon?: boolean
    }
  }
  | {
    singleLine?: {
      mode?: 'strict' | 'minimum'
      beforeColon?: boolean
      afterColon?: boolean
    }
    multiLine?: {
      mode?: 'strict' | 'minimum'
      beforeColon?: boolean
      afterColon?: boolean
    }
    align?: {
      mode?: 'strict' | 'minimum'
      on?: 'colon' | 'value'
      beforeColon?: boolean
      afterColon?: boolean
    }
  }

type KeySpacingRuleOptions = [KeySpacingSchema0?]

interface KeywordSpacingSchema0 {
  before?: boolean
  after?: boolean
  overrides?: {
    abstract?: {
      before?: boolean
      after?: boolean
    }
    boolean?: {
      before?: boolean
      after?: boolean
    }
    break?: {
      before?: boolean
      after?: boolean
    }
    byte?: {
      before?: boolean
      after?: boolean
    }
    case?: {
      before?: boolean
      after?: boolean
    }
    catch?: {
      before?: boolean
      after?: boolean
    }
    char?: {
      before?: boolean
      after?: boolean
    }
    class?: {
      before?: boolean
      after?: boolean
    }
    const?: {
      before?: boolean
      after?: boolean
    }
    continue?: {
      before?: boolean
      after?: boolean
    }
    debugger?: {
      before?: boolean
      after?: boolean
    }
    default?: {
      before?: boolean
      after?: boolean
    }
    delete?: {
      before?: boolean
      after?: boolean
    }
    do?: {
      before?: boolean
      after?: boolean
    }
    double?: {
      before?: boolean
      after?: boolean
    }
    else?: {
      before?: boolean
      after?: boolean
    }
    enum?: {
      before?: boolean
      after?: boolean
    }
    export?: {
      before?: boolean
      after?: boolean
    }
    extends?: {
      before?: boolean
      after?: boolean
    }
    false?: {
      before?: boolean
      after?: boolean
    }
    final?: {
      before?: boolean
      after?: boolean
    }
    finally?: {
      before?: boolean
      after?: boolean
    }
    float?: {
      before?: boolean
      after?: boolean
    }
    for?: {
      before?: boolean
      after?: boolean
    }
    function?: {
      before?: boolean
      after?: boolean
    }
    goto?: {
      before?: boolean
      after?: boolean
    }
    if?: {
      before?: boolean
      after?: boolean
    }
    implements?: {
      before?: boolean
      after?: boolean
    }
    import?: {
      before?: boolean
      after?: boolean
    }
    in?: {
      before?: boolean
      after?: boolean
    }
    instanceof?: {
      before?: boolean
      after?: boolean
    }
    int?: {
      before?: boolean
      after?: boolean
    }
    interface?: {
      before?: boolean
      after?: boolean
    }
    long?: {
      before?: boolean
      after?: boolean
    }
    native?: {
      before?: boolean
      after?: boolean
    }
    new?: {
      before?: boolean
      after?: boolean
    }
    null?: {
      before?: boolean
      after?: boolean
    }
    package?: {
      before?: boolean
      after?: boolean
    }
    private?: {
      before?: boolean
      after?: boolean
    }
    protected?: {
      before?: boolean
      after?: boolean
    }
    public?: {
      before?: boolean
      after?: boolean
    }
    return?: {
      before?: boolean
      after?: boolean
    }
    short?: {
      before?: boolean
      after?: boolean
    }
    static?: {
      before?: boolean
      after?: boolean
    }
    super?: {
      before?: boolean
      after?: boolean
    }
    switch?: {
      before?: boolean
      after?: boolean
    }
    synchronized?: {
      before?: boolean
      after?: boolean
    }
    this?: {
      before?: boolean
      after?: boolean
    }
    throw?: {
      before?: boolean
      after?: boolean
    }
    throws?: {
      before?: boolean
      after?: boolean
    }
    transient?: {
      before?: boolean
      after?: boolean
    }
    true?: {
      before?: boolean
      after?: boolean
    }
    try?: {
      before?: boolean
      after?: boolean
    }
    typeof?: {
      before?: boolean
      after?: boolean
    }
    var?: {
      before?: boolean
      after?: boolean
    }
    void?: {
      before?: boolean
      after?: boolean
    }
    volatile?: {
      before?: boolean
      after?: boolean
    }
    while?: {
      before?: boolean
      after?: boolean
    }
    with?: {
      before?: boolean
      after?: boolean
    }
    as?: {
      before?: boolean
      after?: boolean
    }
    async?: {
      before?: boolean
      after?: boolean
    }
    await?: {
      before?: boolean
      after?: boolean
    }
    from?: {
      before?: boolean
      after?: boolean
    }
    get?: {
      before?: boolean
      after?: boolean
    }
    let?: {
      before?: boolean
      after?: boolean
    }
    of?: {
      before?: boolean
      after?: boolean
    }
    satisfies?: {
      before?: boolean
      after?: boolean
    }
    set?: {
      before?: boolean
      after?: boolean
    }
    using?: {
      before?: boolean
      after?: boolean
    }
    yield?: {
      before?: boolean
      after?: boolean
    }
    type?: {
      before?: boolean
      after?: boolean
    }
  }
}

type KeywordSpacingRuleOptions = [
  KeywordSpacingSchema0?,
]

type LineCommentPositionSchema0
  = | ('above' | 'beside')
    | {
      position?: 'above' | 'beside'
      ignorePattern?: string
      applyDefaultPatterns?: boolean
      applyDefaultIgnorePatterns?: boolean
    }

type LineCommentPositionRuleOptions = [
  LineCommentPositionSchema0?,
]

type LinebreakStyleSchema0 = 'unix' | 'windows'

type LinebreakStyleRuleOptions = [
  LinebreakStyleSchema0?,
]

interface LinesAroundCommentSchema0 {
  beforeBlockComment?: boolean
  afterBlockComment?: boolean
  beforeLineComment?: boolean
  afterLineComment?: boolean
  allowBlockStart?: boolean
  allowBlockEnd?: boolean
  allowClassStart?: boolean
  allowClassEnd?: boolean
  allowObjectStart?: boolean
  allowObjectEnd?: boolean
  allowArrayStart?: boolean
  allowArrayEnd?: boolean
  allowInterfaceStart?: boolean
  allowInterfaceEnd?: boolean
  allowTypeStart?: boolean
  allowTypeEnd?: boolean
  allowEnumStart?: boolean
  allowEnumEnd?: boolean
  allowModuleStart?: boolean
  allowModuleEnd?: boolean
  ignorePattern?: string
  applyDefaultIgnorePatterns?: boolean
  afterHashbangComment?: boolean
}

type LinesAroundCommentRuleOptions = [
  LinesAroundCommentSchema0?,
]

type LinesBetweenClassMembersSchema0
  = | {
    /**
     * @minItems 1
     */
    enforce: [
      {
        blankLine: 'always' | 'never'
        prev: 'method' | 'field' | '*'
        next: 'method' | 'field' | '*'
      },
      ...{
        blankLine: 'always' | 'never'
        prev: 'method' | 'field' | '*'
        next: 'method' | 'field' | '*'
      }[],
    ]
  }
  | ('always' | 'never')

interface LinesBetweenClassMembersSchema1 {
  exceptAfterSingleLine?: boolean
  exceptAfterOverload?: boolean
}

type LinesBetweenClassMembersRuleOptions = [
  LinesBetweenClassMembersSchema0?,
  LinesBetweenClassMembersSchema1?,
]

type MaxLenSchema0
  = | {
    code?: number
    comments?: number
    tabWidth?: number
    ignorePattern?: string
    ignoreComments?: boolean
    ignoreStrings?: boolean
    ignoreUrls?: boolean
    ignoreTemplateLiterals?: boolean
    ignoreRegExpLiterals?: boolean
    ignoreTrailingComments?: boolean
  }
  | number

type MaxLenSchema1
  = | {
    code?: number
    comments?: number
    tabWidth?: number
    ignorePattern?: string
    ignoreComments?: boolean
    ignoreStrings?: boolean
    ignoreUrls?: boolean
    ignoreTemplateLiterals?: boolean
    ignoreRegExpLiterals?: boolean
    ignoreTrailingComments?: boolean
  }
  | number

interface MaxLenSchema2 {
  code?: number
  comments?: number
  tabWidth?: number
  ignorePattern?: string
  ignoreComments?: boolean
  ignoreStrings?: boolean
  ignoreUrls?: boolean
  ignoreTemplateLiterals?: boolean
  ignoreRegExpLiterals?: boolean
  ignoreTrailingComments?: boolean
}

type MaxLenRuleOptions = [
  MaxLenSchema0?,
  MaxLenSchema1?,
  MaxLenSchema2?,
]

interface MaxStatementsPerLineSchema0 {
  max?: number
  ignoredNodes?: (
    | 'BreakStatement'
    | 'ClassDeclaration'
    | 'ContinueStatement'
    | 'DebuggerStatement'
    | 'DoWhileStatement'
    | 'ExpressionStatement'
    | 'ForInStatement'
    | 'ForOfStatement'
    | 'ForStatement'
    | 'FunctionDeclaration'
    | 'IfStatement'
    | 'ImportDeclaration'
    | 'LabeledStatement'
    | 'ReturnStatement'
    | 'SwitchStatement'
    | 'ThrowStatement'
    | 'TryStatement'
    | 'VariableDeclaration'
    | 'WhileStatement'
    | 'WithStatement'
    | 'ExportNamedDeclaration'
    | 'ExportDefaultDeclaration'
    | 'ExportAllDeclaration'
  )[]
}

type MaxStatementsPerLineRuleOptions = [
  MaxStatementsPerLineSchema0?,
]

type MultiLineOption = 'none' | 'semi' | 'comma'
type SingleLineOption = 'semi' | 'comma'

interface MemberDelimiterStyleSchema0 {
  multiline?: {
    delimiter?: MultiLineOption
    requireLast?: boolean
  }
  singleline?: {
    delimiter?: SingleLineOption
    requireLast?: boolean
  }
  overrides?: {
    interface?: DelimiterConfig
    typeLiteral?: DelimiterConfig
  }
  multilineDetection?: 'brackets' | 'last-member'
}
interface DelimiterConfig {
  multiline?: {
    delimiter?: MultiLineOption
    requireLast?: boolean
  }
  singleline?: {
    delimiter?: SingleLineOption
    requireLast?: boolean
  }
}

type MemberDelimiterStyleRuleOptions = [
  MemberDelimiterStyleSchema0?,
]

type MultilineCommentStyleSchema0
  = | []
    | ['starred-block' | 'bare-block']
    | []
    | ['separate-lines']
    | [
      'separate-lines',
      {
        checkJSDoc?: boolean
      },
    ]

type MultilineCommentStyleRuleOptions
  = MultilineCommentStyleSchema0

type MultilineTernarySchema0
  = | 'always'
    | 'always-multiline'
    | 'never'

interface MultilineTernarySchema1 {
  ignoreJSX?: boolean
  [k: string]: unknown
}

type MultilineTernaryRuleOptions = [
  MultilineTernarySchema0?,
  MultilineTernarySchema1?,
]

type NewParensSchema0 = 'always' | 'never'

type NewParensRuleOptions = [NewParensSchema0?]

interface NewlinePerChainedCallSchema0 {
  ignoreChainWithDepth?: number
}

type NewlinePerChainedCallRuleOptions = [
  NewlinePerChainedCallSchema0?,
]

interface NoConfusingArrowSchema0 {
  allowParens?: boolean
  onlyOneSimpleParam?: boolean
}

type NoConfusingArrowRuleOptions = [
  NoConfusingArrowSchema0?,
]

type NoExtraParensSchema0
  = | []
    | ['functions']
    | []
    | ['all']
    | [
      'all',
      {
        conditionalAssign?: boolean
        ternaryOperandBinaryExpressions?: boolean
        nestedBinaryExpressions?: boolean
        returnAssign?: boolean
        ignoreJSX?:
          | 'none'
          | 'all'
          | 'single-line'
          | 'multi-line'
        enforceForArrowConditionals?: boolean
        enforceForSequenceExpressions?: boolean
        enforceForNewInMemberExpressions?: boolean
        enforceForFunctionPrototypeMethods?: boolean
        allowParensAfterCommentPattern?: string
        nestedConditionalExpressions?: boolean
        allowNodesInSpreadElement?: {
          ConditionalExpression?: boolean
          LogicalExpression?: boolean
          AwaitExpression?: boolean
        }
      },
    ]

type NoExtraParensRuleOptions = NoExtraParensSchema0

type NoExtraSemiRuleOptions = []

type NoFloatingDecimalRuleOptions = []

interface NoMixedOperatorsSchema0 {
  groups?: [
    (
      | '+'
      | '-'
      | '*'
      | '/'
      | '%'
      | '**'
      | '&'
      | '|'
      | '^'
      | '~'
      | '<<'
      | '>>'
      | '>>>'
      | '=='
      | '!='
      | '==='
      | '!=='
      | '>'
      | '>='
      | '<'
      | '<='
      | '&&'
      | '||'
      | 'in'
      | 'instanceof'
      | '?:'
      | '??'
    ),
    (
      | '+'
      | '-'
      | '*'
      | '/'
      | '%'
      | '**'
      | '&'
      | '|'
      | '^'
      | '~'
      | '<<'
      | '>>'
      | '>>>'
      | '=='
      | '!='
      | '==='
      | '!=='
      | '>'
      | '>='
      | '<'
      | '<='
      | '&&'
      | '||'
      | 'in'
      | 'instanceof'
      | '?:'
      | '??'
    ),
    ...(
      | '+'
      | '-'
      | '*'
      | '/'
      | '%'
      | '**'
      | '&'
      | '|'
      | '^'
      | '~'
      | '<<'
      | '>>'
      | '>>>'
      | '=='
      | '!='
      | '==='
      | '!=='
      | '>'
      | '>='
      | '<'
      | '<='
      | '&&'
      | '||'
      | 'in'
      | 'instanceof'
      | '?:'
      | '??'
    )[],
  ][]
  allowSamePrecedence?: boolean
}

type NoMixedOperatorsRuleOptions = [
  NoMixedOperatorsSchema0?,
]

type NoMixedSpacesAndTabsSchema0
  = | 'smart-tabs'
    | boolean

type NoMixedSpacesAndTabsRuleOptions = [
  NoMixedSpacesAndTabsSchema0?,
]

interface NoMultiSpacesSchema0 {
  exceptions?: {
    [k: string]: boolean
  }
  ignoreEOLComments?: boolean
  includeTabs?: boolean
}

type NoMultiSpacesRuleOptions = [
  NoMultiSpacesSchema0?,
]

interface NoMultipleEmptyLinesSchema0 {
  max: number
  maxEOF?: number
  maxBOF?: number
}

type NoMultipleEmptyLinesRuleOptions = [
  NoMultipleEmptyLinesSchema0?,
]

interface NoTabsSchema0 {
  allowIndentationTabs?: boolean
}

type NoTabsRuleOptions = [NoTabsSchema0?]

interface NoTrailingSpacesSchema0 {
  skipBlankLines?: boolean
  ignoreComments?: boolean
}

type NoTrailingSpacesRuleOptions = [
  NoTrailingSpacesSchema0?,
]

type NoWhitespaceBeforePropertyRuleOptions = []

type NonblockStatementBodyPositionSchema0
  = | 'beside'
    | 'below'
    | 'any'

interface NonblockStatementBodyPositionSchema1 {
  overrides?: {
    if?: 'beside' | 'below' | 'any'
    else?: 'beside' | 'below' | 'any'
    while?: 'beside' | 'below' | 'any'
    do?: 'beside' | 'below' | 'any'
    for?: 'beside' | 'below' | 'any'
  }
}

type NonblockStatementBodyPositionRuleOptions = [
  NonblockStatementBodyPositionSchema0?,
  NonblockStatementBodyPositionSchema1?,
]

type ObjectCurlyNewlineSchema0
  = | (
      | ('always' | 'never')
      | {
        multiline?: boolean
        minProperties?: number
        consistent?: boolean
      }
    )
    | {
      ObjectExpression?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minProperties?: number
          consistent?: boolean
        }
      ObjectPattern?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minProperties?: number
          consistent?: boolean
        }
      ImportDeclaration?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minProperties?: number
          consistent?: boolean
        }
      ExportDeclaration?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minProperties?: number
          consistent?: boolean
        }
      TSTypeLiteral?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minProperties?: number
          consistent?: boolean
        }
      TSInterfaceBody?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minProperties?: number
          consistent?: boolean
        }
      TSEnumBody?:
        | ('always' | 'never')
        | {
          multiline?: boolean
          minProperties?: number
          consistent?: boolean
        }
    }

type ObjectCurlyNewlineRuleOptions = [
  ObjectCurlyNewlineSchema0?,
]

type ObjectCurlySpacingSchema0 = 'always' | 'never'

interface ObjectCurlySpacingSchema1 {
  arraysInObjects?: boolean
  objectsInObjects?: boolean
}

type ObjectCurlySpacingRuleOptions = [
  ObjectCurlySpacingSchema0?,
  ObjectCurlySpacingSchema1?,
]

interface ObjectPropertyNewlineSchema0 {
  allowAllPropertiesOnSameLine?: boolean
}

type ObjectPropertyNewlineRuleOptions = [
  ObjectPropertyNewlineSchema0?,
]

type OneVarDeclarationPerLineSchema0
  = | 'always'
    | 'initializations'

type OneVarDeclarationPerLineRuleOptions = [
  OneVarDeclarationPerLineSchema0?,
]

type OperatorLinebreakSchema0
  = | ('after' | 'before' | 'none')
    | null

interface OperatorLinebreakSchema1 {
  overrides?: {
    [k: string]: 'after' | 'before' | 'none' | 'ignore'
  }
}

type OperatorLinebreakRuleOptions = [
  OperatorLinebreakSchema0?,
  OperatorLinebreakSchema1?,
]

type PaddedBlocksSchema0
  = | ('always' | 'never' | 'start' | 'end')
    | {
      blocks?: 'always' | 'never' | 'start' | 'end'
      switches?: 'always' | 'never' | 'start' | 'end'
      classes?: 'always' | 'never' | 'start' | 'end'
    }

interface PaddedBlocksSchema1 {
  allowSingleLineBlocks?: boolean
}

type PaddedBlocksRuleOptions = [
  PaddedBlocksSchema0?,
  PaddedBlocksSchema1?,
]

type PaddingType = 'any' | 'never' | 'always'
type StatementType
  = | (
    | '*'
    | 'block-like'
    | 'exports'
    | 'require'
    | 'directive'
    | 'expression'
    | 'iife'
    | 'multiline-block-like'
    | 'multiline-expression'
    | 'multiline-const'
    | 'multiline-export'
    | 'multiline-let'
    | 'multiline-using'
    | 'multiline-var'
    | 'singleline-const'
    | 'singleline-export'
    | 'singleline-let'
    | 'singleline-using'
    | 'singleline-var'
    | 'block'
    | 'empty'
    | 'function'
    | 'ts-method'
    | 'break'
    | 'case'
    | 'class'
    | 'const'
    | 'continue'
    | 'debugger'
    | 'default'
    | 'do'
    | 'export'
    | 'for'
    | 'if'
    | 'import'
    | 'let'
    | 'return'
    | 'switch'
    | 'throw'
    | 'try'
    | 'using'
    | 'var'
    | 'while'
    | 'with'
    | 'cjs-export'
    | 'cjs-import'
    | 'enum'
    | 'interface'
    | 'type'
    | 'function-overload'
    )
    | [
      (
        | '*'
        | 'block-like'
        | 'exports'
        | 'require'
        | 'directive'
        | 'expression'
        | 'iife'
        | 'multiline-block-like'
        | 'multiline-expression'
        | 'multiline-const'
        | 'multiline-export'
        | 'multiline-let'
        | 'multiline-using'
        | 'multiline-var'
        | 'singleline-const'
        | 'singleline-export'
        | 'singleline-let'
        | 'singleline-using'
        | 'singleline-var'
        | 'block'
        | 'empty'
        | 'function'
        | 'ts-method'
        | 'break'
        | 'case'
        | 'class'
        | 'const'
        | 'continue'
        | 'debugger'
        | 'default'
        | 'do'
        | 'export'
        | 'for'
        | 'if'
        | 'import'
        | 'let'
        | 'return'
        | 'switch'
        | 'throw'
        | 'try'
        | 'using'
        | 'var'
        | 'while'
        | 'with'
        | 'cjs-export'
        | 'cjs-import'
        | 'enum'
        | 'interface'
        | 'type'
        | 'function-overload'
      ),
      ...(
        | '*'
        | 'block-like'
        | 'exports'
        | 'require'
        | 'directive'
        | 'expression'
        | 'iife'
        | 'multiline-block-like'
        | 'multiline-expression'
        | 'multiline-const'
        | 'multiline-export'
        | 'multiline-let'
        | 'multiline-using'
        | 'multiline-var'
        | 'singleline-const'
        | 'singleline-export'
        | 'singleline-let'
        | 'singleline-using'
        | 'singleline-var'
        | 'block'
        | 'empty'
        | 'function'
        | 'ts-method'
        | 'break'
        | 'case'
        | 'class'
        | 'const'
        | 'continue'
        | 'debugger'
        | 'default'
        | 'do'
        | 'export'
        | 'for'
        | 'if'
        | 'import'
        | 'let'
        | 'return'
        | 'switch'
        | 'throw'
        | 'try'
        | 'using'
        | 'var'
        | 'while'
        | 'with'
        | 'cjs-export'
        | 'cjs-import'
        | 'enum'
        | 'interface'
        | 'type'
        | 'function-overload'
      )[],
    ]
type PaddingLineBetweenStatementsSchema0 = {
  blankLine: PaddingType
  prev: StatementType
  next: StatementType
}[]

type PaddingLineBetweenStatementsRuleOptions
  = PaddingLineBetweenStatementsSchema0

type QuotePropsSchema0
  = | []
    | [
      | 'always'
      | 'as-needed'
      | 'consistent'
      | 'consistent-as-needed',
    ]
    | []
    | [
      | 'always'
      | 'as-needed'
      | 'consistent'
      | 'consistent-as-needed',
    ]
    | [
      (
        | 'always'
        | 'as-needed'
        | 'consistent'
        | 'consistent-as-needed'
      ),
      {
        keywords?: boolean
        unnecessary?: boolean
        numbers?: boolean
      },
    ]

type QuotePropsRuleOptions = QuotePropsSchema0

type QuotesSchema0 = 'single' | 'double' | 'backtick'

type QuotesSchema1
  = | 'avoid-escape'
    | {
      avoidEscape?: boolean
      allowTemplateLiterals?:
        | boolean
        | ('never' | 'avoidEscape' | 'always')
      ignoreStringLiterals?: boolean
    }

type QuotesRuleOptions = [
  QuotesSchema0?,
  QuotesSchema1?,
]

type RestSpreadSpacingSchema0 = 'always' | 'never'

type RestSpreadSpacingRuleOptions = [
  RestSpreadSpacingSchema0?,
]

interface SemiSpacingSchema0 {
  before?: boolean
  after?: boolean
}

type SemiSpacingRuleOptions = [SemiSpacingSchema0?]

type SemiStyleSchema0 = 'last' | 'first'

type SemiStyleRuleOptions = [SemiStyleSchema0?]

type SemiSchema0
  = | []
    | ['never']
    | [
      'never',
      {
        beforeStatementContinuationChars?:
          | 'always'
          | 'any'
          | 'never'
      },
    ]
    | []
    | ['always']
    | [
      'always',
      {
        omitLastInOneLineBlock?: boolean
        omitLastInOneLineClassBody?: boolean
      },
    ]

type SemiRuleOptions = SemiSchema0

type SpaceBeforeBlocksSchema0
  = | ('always' | 'never')
    | {
      keywords?: 'always' | 'never' | 'off'
      functions?: 'always' | 'never' | 'off'
      classes?: 'always' | 'never' | 'off'
      modules?: 'always' | 'never' | 'off'
    }

type SpaceBeforeBlocksRuleOptions = [
  SpaceBeforeBlocksSchema0?,
]

type SpaceBeforeFunctionParenSchema0
  = | ('always' | 'never')
    | {
      anonymous?: 'always' | 'never' | 'ignore'
      named?: 'always' | 'never' | 'ignore'
      asyncArrow?: 'always' | 'never' | 'ignore'
      catch?: 'always' | 'never' | 'ignore'
    }

type SpaceBeforeFunctionParenRuleOptions = [
  SpaceBeforeFunctionParenSchema0?,
]

type SpaceInParensSchema0 = 'always' | 'never'

interface SpaceInParensSchema1 {
  exceptions?: ('{}' | '[]' | '()' | 'empty')[]
}

type SpaceInParensRuleOptions = [
  SpaceInParensSchema0?,
  SpaceInParensSchema1?,
]

interface SpaceInfixOpsSchema0 {
  int32Hint?: boolean
  ignoreTypes?: boolean
}

type SpaceInfixOpsRuleOptions = [
  SpaceInfixOpsSchema0?,
]

interface SpaceUnaryOpsSchema0 {
  words?: boolean
  nonwords?: boolean
  overrides?: {
    [k: string]: boolean
  }
}

type SpaceUnaryOpsRuleOptions = [
  SpaceUnaryOpsSchema0?,
]

type SpacedCommentSchema0 = 'always' | 'never'

interface SpacedCommentSchema1 {
  exceptions?: string[]
  markers?: string[]
  line?: {
    exceptions?: string[]
    markers?: string[]
  }
  block?: {
    exceptions?: string[]
    markers?: string[]
    balanced?: boolean
  }
}

type SpacedCommentRuleOptions = [
  SpacedCommentSchema0?,
  SpacedCommentSchema1?,
]

interface SwitchColonSpacingSchema0 {
  before?: boolean
  after?: boolean
}

type SwitchColonSpacingRuleOptions = [
  SwitchColonSpacingSchema0?,
]

type TemplateCurlySpacingSchema0 = 'always' | 'never'

type TemplateCurlySpacingRuleOptions = [
  TemplateCurlySpacingSchema0?,
]

type TemplateTagSpacingSchema0 = 'always' | 'never'

type TemplateTagSpacingRuleOptions = [
  TemplateTagSpacingSchema0?,
]

interface TypeAnnotationSpacingSchema0 {
  before?: boolean
  after?: boolean
  overrides?: {
    colon?: SpacingConfig
    arrow?: SpacingConfig
    variable?: SpacingConfig
    parameter?: SpacingConfig
    property?: SpacingConfig
    returnType?: SpacingConfig
  }
}
interface SpacingConfig {
  before?: boolean
  after?: boolean
}

type TypeAnnotationSpacingRuleOptions = [
  TypeAnnotationSpacingSchema0?,
]

type TypeGenericSpacingRuleOptions = []

type TypeNamedTupleSpacingRuleOptions = []

type WrapIifeSchema0 = 'outside' | 'inside' | 'any'

interface WrapIifeSchema1 {
  functionPrototypeMethods?: boolean
}

type WrapIifeRuleOptions = [
  WrapIifeSchema0?,
  WrapIifeSchema1?,
]

type WrapRegexRuleOptions = []

type YieldStarSpacingSchema0
  = | ('before' | 'after' | 'both' | 'neither')
    | {
      before?: boolean
      after?: boolean
    }

type YieldStarSpacingRuleOptions = [
  YieldStarSpacingSchema0?,
]

interface RuleOptions {
  /**
   * Enforce linebreaks after opening and before closing array brackets
   * @see https://eslint.style/rules/array-bracket-newline
   */
  '@stylistic/array-bracket-newline': ArrayBracketNewlineRuleOptions
  /**
   * Enforce consistent spacing inside array brackets
   * @see https://eslint.style/rules/array-bracket-spacing
   */
  '@stylistic/array-bracket-spacing': ArrayBracketSpacingRuleOptions
  /**
   * Enforce line breaks after each array element
   * @see https://eslint.style/rules/array-element-newline
   */
  '@stylistic/array-element-newline': ArrayElementNewlineRuleOptions
  /**
   * Require parentheses around arrow function arguments
   * @see https://eslint.style/rules/arrow-parens
   */
  '@stylistic/arrow-parens': ArrowParensRuleOptions
  /**
   * Enforce consistent spacing before and after the arrow in arrow functions
   * @see https://eslint.style/rules/arrow-spacing
   */
  '@stylistic/arrow-spacing': ArrowSpacingRuleOptions
  /**
   * Disallow or enforce spaces inside of blocks after opening block and before closing block
   * @see https://eslint.style/rules/block-spacing
   */
  '@stylistic/block-spacing': BlockSpacingRuleOptions
  /**
   * Enforce consistent brace style for blocks
   * @see https://eslint.style/rules/brace-style
   */
  '@stylistic/brace-style': BraceStyleRuleOptions
  /**
   * Require or disallow trailing commas
   * @see https://eslint.style/rules/comma-dangle
   */
  '@stylistic/comma-dangle': CommaDangleRuleOptions
  /**
   * Enforce consistent spacing before and after commas
   * @see https://eslint.style/rules/comma-spacing
   */
  '@stylistic/comma-spacing': CommaSpacingRuleOptions
  /**
   * Enforce consistent comma style
   * @see https://eslint.style/rules/comma-style
   */
  '@stylistic/comma-style': CommaStyleRuleOptions
  /**
   * Enforce consistent spacing inside computed property brackets
   * @see https://eslint.style/rules/computed-property-spacing
   */
  '@stylistic/computed-property-spacing': ComputedPropertySpacingRuleOptions
  /**
   * Enforce consistent line breaks after opening and before closing braces
   * @see https://eslint.style/rules/curly-newline
   */
  '@stylistic/curly-newline': CurlyNewlineRuleOptions
  /**
   * Enforce consistent newlines before and after dots
   * @see https://eslint.style/rules/dot-location
   */
  '@stylistic/dot-location': DotLocationRuleOptions
  /**
   * Require or disallow newline at the end of files
   * @see https://eslint.style/rules/eol-last
   */
  '@stylistic/eol-last': EolLastRuleOptions
  /**
   * Enforce line breaks between arguments of a function call
   * @see https://eslint.style/rules/function-call-argument-newline
   */
  '@stylistic/function-call-argument-newline': FunctionCallArgumentNewlineRuleOptions
  /**
   * Require or disallow spacing between function identifiers and their invocations
   * @see https://eslint.style/rules/function-call-spacing
   */
  '@stylistic/function-call-spacing': FunctionCallSpacingRuleOptions
  /**
   * Enforce consistent line breaks inside function parentheses
   * @see https://eslint.style/rules/function-paren-newline
   */
  '@stylistic/function-paren-newline': FunctionParenNewlineRuleOptions
  /**
   * Enforce consistent spacing around `*` operators in generator functions
   * @see https://eslint.style/rules/generator-star-spacing
   */
  '@stylistic/generator-star-spacing': GeneratorStarSpacingRuleOptions
  /**
   * Enforce the location of arrow function bodies
   * @see https://eslint.style/rules/implicit-arrow-linebreak
   */
  '@stylistic/implicit-arrow-linebreak': ImplicitArrowLinebreakRuleOptions
  /**
   * Enforce consistent indentation
   * @see https://eslint.style/rules/indent
   */
  '@stylistic/indent': IndentRuleOptions
  /**
   * Indentation for binary operators
   * @see https://eslint.style/rules/indent-binary-ops
   */
  '@stylistic/indent-binary-ops': IndentBinaryOpsRuleOptions
  /**
   * Enforce or disallow spaces inside of curly braces in JSX attributes and expressions
   * @see https://eslint.style/rules/jsx-child-element-spacing
   */
  '@stylistic/jsx-child-element-spacing': JsxChildElementSpacingRuleOptions
  /**
   * Enforce closing bracket location in JSX
   * @see https://eslint.style/rules/jsx-closing-bracket-location
   */
  '@stylistic/jsx-closing-bracket-location': JsxClosingBracketLocationRuleOptions
  /**
   * Enforce closing tag location for multiline JSX
   * @see https://eslint.style/rules/jsx-closing-tag-location
   */
  '@stylistic/jsx-closing-tag-location': JsxClosingTagLocationRuleOptions
  /**
   * Disallow unnecessary JSX expressions when literals alone are sufficient or enforce JSX expressions on literals in JSX children or attributes
   * @see https://eslint.style/rules/jsx-curly-brace-presence
   */
  '@stylistic/jsx-curly-brace-presence': JsxCurlyBracePresenceRuleOptions
  /**
   * Enforce consistent linebreaks in curly braces in JSX attributes and expressions
   * @see https://eslint.style/rules/jsx-curly-newline
   */
  '@stylistic/jsx-curly-newline': JsxCurlyNewlineRuleOptions
  /**
   * Enforce or disallow spaces inside of curly braces in JSX attributes and expressions
   * @see https://eslint.style/rules/jsx-curly-spacing
   */
  '@stylistic/jsx-curly-spacing': JsxCurlySpacingRuleOptions
  /**
   * Enforce or disallow spaces around equal signs in JSX attributes
   * @see https://eslint.style/rules/jsx-equals-spacing
   */
  '@stylistic/jsx-equals-spacing': JsxEqualsSpacingRuleOptions
  /**
   * Enforce proper position of the first property in JSX
   * @see https://eslint.style/rules/jsx-first-prop-new-line
   */
  '@stylistic/jsx-first-prop-new-line': JsxFirstPropNewLineRuleOptions
  /**
   * Enforce line breaks before and after JSX elements when they are used as arguments to a function.
   * @see https://eslint.style/rules/jsx-function-call-newline
   */
  '@stylistic/jsx-function-call-newline': JsxFunctionCallNewlineRuleOptions
  /**
   * Enforce JSX indentation. Deprecated, use `indent` rule instead.
   * @see https://eslint.style/rules/jsx-indent
   */
  '@stylistic/jsx-indent': JsxIndentRuleOptions
  /**
   * Enforce props indentation in JSX
   * @see https://eslint.style/rules/jsx-indent-props
   */
  '@stylistic/jsx-indent-props': JsxIndentPropsRuleOptions
  /**
   * Enforce maximum of props on a single line in JSX
   * @see https://eslint.style/rules/jsx-max-props-per-line
   */
  '@stylistic/jsx-max-props-per-line': JsxMaxPropsPerLineRuleOptions
  /**
   * Require or prevent a new line after jsx elements and expressions.
   * @see https://eslint.style/rules/jsx-newline
   */
  '@stylistic/jsx-newline': JsxNewlineRuleOptions
  /**
   * Require one JSX element per line
   * @see https://eslint.style/rules/jsx-one-expression-per-line
   */
  '@stylistic/jsx-one-expression-per-line': JsxOneExpressionPerLineRuleOptions
  /**
   * Enforce PascalCase for user-defined JSX components
   * @see https://eslint.style/rules/jsx-pascal-case
   */
  '@stylistic/jsx-pascal-case': JsxPascalCaseRuleOptions
  /**
   * Disallow multiple spaces between inline JSX props
   * @see https://eslint.style/rules/jsx-props-no-multi-spaces
   */
  '@stylistic/jsx-props-no-multi-spaces': JsxPropsNoMultiSpacesRuleOptions
  /**
   * Enforce the consistent use of either double or single quotes in JSX attributes
   * @see https://eslint.style/rules/jsx-quotes
   */
  '@stylistic/jsx-quotes': JsxQuotesRuleOptions
  /**
   * Disallow extra closing tags for components without children
   * @see https://eslint.style/rules/jsx-self-closing-comp
   */
  '@stylistic/jsx-self-closing-comp': JsxSelfClosingCompRuleOptions
  /**
   * Enforce props alphabetical sorting
   * @see https://eslint.style/rules/jsx-sort-props
   */
  '@stylistic/jsx-sort-props': JsxSortPropsRuleOptions
  /**
   * Enforce whitespace in and around the JSX opening and closing brackets
   * @see https://eslint.style/rules/jsx-tag-spacing
   */
  '@stylistic/jsx-tag-spacing': JsxTagSpacingRuleOptions
  /**
   * Disallow missing parentheses around multiline JSX
   * @see https://eslint.style/rules/jsx-wrap-multilines
   */
  '@stylistic/jsx-wrap-multilines': JsxWrapMultilinesRuleOptions
  /**
   * Enforce consistent spacing between property names and type annotations in types and interfaces
   * @see https://eslint.style/rules/key-spacing
   */
  '@stylistic/key-spacing': KeySpacingRuleOptions
  /**
   * Enforce consistent spacing before and after keywords
   * @see https://eslint.style/rules/keyword-spacing
   */
  '@stylistic/keyword-spacing': KeywordSpacingRuleOptions
  /**
   * Enforce position of line comments
   * @see https://eslint.style/rules/line-comment-position
   */
  '@stylistic/line-comment-position': LineCommentPositionRuleOptions
  /**
   * Enforce consistent linebreak style
   * @see https://eslint.style/rules/linebreak-style
   */
  '@stylistic/linebreak-style': LinebreakStyleRuleOptions
  /**
   * Require empty lines around comments
   * @see https://eslint.style/rules/lines-around-comment
   */
  '@stylistic/lines-around-comment': LinesAroundCommentRuleOptions
  /**
   * Require or disallow an empty line between class members
   * @see https://eslint.style/rules/lines-between-class-members
   */
  '@stylistic/lines-between-class-members': LinesBetweenClassMembersRuleOptions
  /**
   * Enforce a maximum line length
   * @see https://eslint.style/rules/max-len
   */
  '@stylistic/max-len': MaxLenRuleOptions
  /**
   * Enforce a maximum number of statements allowed per line
   * @see https://eslint.style/rules/max-statements-per-line
   */
  '@stylistic/max-statements-per-line': MaxStatementsPerLineRuleOptions
  /**
   * Require a specific member delimiter style for interfaces and type literals
   * @see https://eslint.style/rules/member-delimiter-style
   */
  '@stylistic/member-delimiter-style': MemberDelimiterStyleRuleOptions
  /**
   * Enforce a particular style for multiline comments
   * @see https://eslint.style/rules/multiline-comment-style
   */
  '@stylistic/multiline-comment-style': MultilineCommentStyleRuleOptions
  /**
   * Enforce newlines between operands of ternary expressions
   * @see https://eslint.style/rules/multiline-ternary
   */
  '@stylistic/multiline-ternary': MultilineTernaryRuleOptions
  /**
   * Enforce or disallow parentheses when invoking a constructor with no arguments
   * @see https://eslint.style/rules/new-parens
   */
  '@stylistic/new-parens': NewParensRuleOptions
  /**
   * Require a newline after each call in a method chain
   * @see https://eslint.style/rules/newline-per-chained-call
   */
  '@stylistic/newline-per-chained-call': NewlinePerChainedCallRuleOptions
  /**
   * Disallow arrow functions where they could be confused with comparisons
   * @see https://eslint.style/rules/no-confusing-arrow
   */
  '@stylistic/no-confusing-arrow': NoConfusingArrowRuleOptions
  /**
   * Disallow unnecessary parentheses
   * @see https://eslint.style/rules/no-extra-parens
   */
  '@stylistic/no-extra-parens': NoExtraParensRuleOptions
  /**
   * Disallow unnecessary semicolons
   * @see https://eslint.style/rules/no-extra-semi
   */
  '@stylistic/no-extra-semi': NoExtraSemiRuleOptions
  /**
   * Disallow leading or trailing decimal points in numeric literals
   * @see https://eslint.style/rules/no-floating-decimal
   */
  '@stylistic/no-floating-decimal': NoFloatingDecimalRuleOptions
  /**
   * Disallow mixed binary operators
   * @see https://eslint.style/rules/no-mixed-operators
   */
  '@stylistic/no-mixed-operators': NoMixedOperatorsRuleOptions
  /**
   * Disallow mixed spaces and tabs for indentation
   * @see https://eslint.style/rules/no-mixed-spaces-and-tabs
   */
  '@stylistic/no-mixed-spaces-and-tabs': NoMixedSpacesAndTabsRuleOptions
  /**
   * Disallow multiple spaces
   * @see https://eslint.style/rules/no-multi-spaces
   */
  '@stylistic/no-multi-spaces': NoMultiSpacesRuleOptions
  /**
   * Disallow multiple empty lines
   * @see https://eslint.style/rules/no-multiple-empty-lines
   */
  '@stylistic/no-multiple-empty-lines': NoMultipleEmptyLinesRuleOptions
  /**
   * Disallow all tabs
   * @see https://eslint.style/rules/no-tabs
   */
  '@stylistic/no-tabs': NoTabsRuleOptions
  /**
   * Disallow trailing whitespace at the end of lines
   * @see https://eslint.style/rules/no-trailing-spaces
   */
  '@stylistic/no-trailing-spaces': NoTrailingSpacesRuleOptions
  /**
   * Disallow whitespace before properties
   * @see https://eslint.style/rules/no-whitespace-before-property
   */
  '@stylistic/no-whitespace-before-property': NoWhitespaceBeforePropertyRuleOptions
  /**
   * Enforce the location of single-line statements
   * @see https://eslint.style/rules/nonblock-statement-body-position
   */
  '@stylistic/nonblock-statement-body-position': NonblockStatementBodyPositionRuleOptions
  /**
   * Enforce consistent line breaks after opening and before closing braces
   * @see https://eslint.style/rules/object-curly-newline
   */
  '@stylistic/object-curly-newline': ObjectCurlyNewlineRuleOptions
  /**
   * Enforce consistent spacing inside braces
   * @see https://eslint.style/rules/object-curly-spacing
   */
  '@stylistic/object-curly-spacing': ObjectCurlySpacingRuleOptions
  /**
   * Enforce placing object properties on separate lines
   * @see https://eslint.style/rules/object-property-newline
   */
  '@stylistic/object-property-newline': ObjectPropertyNewlineRuleOptions
  /**
   * Require or disallow newlines around variable declarations
   * @see https://eslint.style/rules/one-var-declaration-per-line
   */
  '@stylistic/one-var-declaration-per-line': OneVarDeclarationPerLineRuleOptions
  /**
   * Enforce consistent linebreak style for operators
   * @see https://eslint.style/rules/operator-linebreak
   */
  '@stylistic/operator-linebreak': OperatorLinebreakRuleOptions
  /**
   * Require or disallow padding within blocks
   * @see https://eslint.style/rules/padded-blocks
   */
  '@stylistic/padded-blocks': PaddedBlocksRuleOptions
  /**
   * Require or disallow padding lines between statements
   * @see https://eslint.style/rules/padding-line-between-statements
   */
  '@stylistic/padding-line-between-statements': PaddingLineBetweenStatementsRuleOptions
  /**
   * Require quotes around object literal, type literal, interfaces and enums property names
   * @see https://eslint.style/rules/quote-props
   */
  '@stylistic/quote-props': QuotePropsRuleOptions
  /**
   * Enforce the consistent use of either backticks, double, or single quotes
   * @see https://eslint.style/rules/quotes
   */
  '@stylistic/quotes': QuotesRuleOptions
  /**
   * Enforce spacing between rest and spread operators and their expressions
   * @see https://eslint.style/rules/rest-spread-spacing
   */
  '@stylistic/rest-spread-spacing': RestSpreadSpacingRuleOptions
  /**
   * Require or disallow semicolons instead of ASI
   * @see https://eslint.style/rules/semi
   */
  '@stylistic/semi': SemiRuleOptions
  /**
   * Enforce consistent spacing before and after semicolons
   * @see https://eslint.style/rules/semi-spacing
   */
  '@stylistic/semi-spacing': SemiSpacingRuleOptions
  /**
   * Enforce location of semicolons
   * @see https://eslint.style/rules/semi-style
   */
  '@stylistic/semi-style': SemiStyleRuleOptions
  /**
   * Enforce consistent spacing before blocks
   * @see https://eslint.style/rules/space-before-blocks
   */
  '@stylistic/space-before-blocks': SpaceBeforeBlocksRuleOptions
  /**
   * Enforce consistent spacing before function parenthesis
   * @see https://eslint.style/rules/space-before-function-paren
   */
  '@stylistic/space-before-function-paren': SpaceBeforeFunctionParenRuleOptions
  /**
   * Enforce consistent spacing inside parentheses
   * @see https://eslint.style/rules/space-in-parens
   */
  '@stylistic/space-in-parens': SpaceInParensRuleOptions
  /**
   * Require spacing around infix operators
   * @see https://eslint.style/rules/space-infix-ops
   */
  '@stylistic/space-infix-ops': SpaceInfixOpsRuleOptions
  /**
   * Enforce consistent spacing before or after unary operators
   * @see https://eslint.style/rules/space-unary-ops
   */
  '@stylistic/space-unary-ops': SpaceUnaryOpsRuleOptions
  /**
   * Enforce consistent spacing after the `//` or `/*` in a comment
   * @see https://eslint.style/rules/spaced-comment
   */
  '@stylistic/spaced-comment': SpacedCommentRuleOptions
  /**
   * Enforce spacing around colons of switch statements
   * @see https://eslint.style/rules/switch-colon-spacing
   */
  '@stylistic/switch-colon-spacing': SwitchColonSpacingRuleOptions
  /**
   * Require or disallow spacing around embedded expressions of template strings
   * @see https://eslint.style/rules/template-curly-spacing
   */
  '@stylistic/template-curly-spacing': TemplateCurlySpacingRuleOptions
  /**
   * Require or disallow spacing between template tags and their literals
   * @see https://eslint.style/rules/template-tag-spacing
   */
  '@stylistic/template-tag-spacing': TemplateTagSpacingRuleOptions
  /**
   * Require consistent spacing around type annotations
   * @see https://eslint.style/rules/type-annotation-spacing
   */
  '@stylistic/type-annotation-spacing': TypeAnnotationSpacingRuleOptions
  /**
   * Enforces consistent spacing inside TypeScript type generics
   * @see https://eslint.style/rules/type-generic-spacing
   */
  '@stylistic/type-generic-spacing': TypeGenericSpacingRuleOptions
  /**
   * Expect space before the type declaration in the named tuple
   * @see https://eslint.style/rules/type-named-tuple-spacing
   */
  '@stylistic/type-named-tuple-spacing': TypeNamedTupleSpacingRuleOptions
  /**
   * Require parentheses around immediate `function` invocations
   * @see https://eslint.style/rules/wrap-iife
   */
  '@stylistic/wrap-iife': WrapIifeRuleOptions
  /**
   * Require parenthesis around regex literals
   * @see https://eslint.style/rules/wrap-regex
   */
  '@stylistic/wrap-regex': WrapRegexRuleOptions
  /**
   * Require or disallow spacing around the `*` in `yield*` expressions
   * @see https://eslint.style/rules/yield-star-spacing
   */
  '@stylistic/yield-star-spacing': YieldStarSpacingRuleOptions
}

interface UnprefixedRuleOptions {
  /**
   * Enforce linebreaks after opening and before closing array brackets
   * @see https://eslint.style/rules/array-bracket-newline
   */
  'array-bracket-newline': ArrayBracketNewlineRuleOptions
  /**
   * Enforce consistent spacing inside array brackets
   * @see https://eslint.style/rules/array-bracket-spacing
   */
  'array-bracket-spacing': ArrayBracketSpacingRuleOptions
  /**
   * Enforce line breaks after each array element
   * @see https://eslint.style/rules/array-element-newline
   */
  'array-element-newline': ArrayElementNewlineRuleOptions
  /**
   * Require parentheses around arrow function arguments
   * @see https://eslint.style/rules/arrow-parens
   */
  'arrow-parens': ArrowParensRuleOptions
  /**
   * Enforce consistent spacing before and after the arrow in arrow functions
   * @see https://eslint.style/rules/arrow-spacing
   */
  'arrow-spacing': ArrowSpacingRuleOptions
  /**
   * Disallow or enforce spaces inside of blocks after opening block and before closing block
   * @see https://eslint.style/rules/block-spacing
   */
  'block-spacing': BlockSpacingRuleOptions
  /**
   * Enforce consistent brace style for blocks
   * @see https://eslint.style/rules/brace-style
   */
  'brace-style': BraceStyleRuleOptions
  /**
   * Require or disallow trailing commas
   * @see https://eslint.style/rules/comma-dangle
   */
  'comma-dangle': CommaDangleRuleOptions
  /**
   * Enforce consistent spacing before and after commas
   * @see https://eslint.style/rules/comma-spacing
   */
  'comma-spacing': CommaSpacingRuleOptions
  /**
   * Enforce consistent comma style
   * @see https://eslint.style/rules/comma-style
   */
  'comma-style': CommaStyleRuleOptions
  /**
   * Enforce consistent spacing inside computed property brackets
   * @see https://eslint.style/rules/computed-property-spacing
   */
  'computed-property-spacing': ComputedPropertySpacingRuleOptions
  /**
   * Enforce consistent line breaks after opening and before closing braces
   * @see https://eslint.style/rules/curly-newline
   */
  'curly-newline': CurlyNewlineRuleOptions
  /**
   * Enforce consistent newlines before and after dots
   * @see https://eslint.style/rules/dot-location
   */
  'dot-location': DotLocationRuleOptions
  /**
   * Require or disallow newline at the end of files
   * @see https://eslint.style/rules/eol-last
   */
  'eol-last': EolLastRuleOptions
  /**
   * Enforce line breaks between arguments of a function call
   * @see https://eslint.style/rules/function-call-argument-newline
   */
  'function-call-argument-newline': FunctionCallArgumentNewlineRuleOptions
  /**
   * Require or disallow spacing between function identifiers and their invocations
   * @see https://eslint.style/rules/function-call-spacing
   */
  'function-call-spacing': FunctionCallSpacingRuleOptions
  /**
   * Enforce consistent line breaks inside function parentheses
   * @see https://eslint.style/rules/function-paren-newline
   */
  'function-paren-newline': FunctionParenNewlineRuleOptions
  /**
   * Enforce consistent spacing around `*` operators in generator functions
   * @see https://eslint.style/rules/generator-star-spacing
   */
  'generator-star-spacing': GeneratorStarSpacingRuleOptions
  /**
   * Enforce the location of arrow function bodies
   * @see https://eslint.style/rules/implicit-arrow-linebreak
   */
  'implicit-arrow-linebreak': ImplicitArrowLinebreakRuleOptions
  /**
   * Enforce consistent indentation
   * @see https://eslint.style/rules/indent
   */
  'indent': IndentRuleOptions
  /**
   * Indentation for binary operators
   * @see https://eslint.style/rules/indent-binary-ops
   */
  'indent-binary-ops': IndentBinaryOpsRuleOptions
  /**
   * Enforce or disallow spaces inside of curly braces in JSX attributes and expressions
   * @see https://eslint.style/rules/jsx-child-element-spacing
   */
  'jsx-child-element-spacing': JsxChildElementSpacingRuleOptions
  /**
   * Enforce closing bracket location in JSX
   * @see https://eslint.style/rules/jsx-closing-bracket-location
   */
  'jsx-closing-bracket-location': JsxClosingBracketLocationRuleOptions
  /**
   * Enforce closing tag location for multiline JSX
   * @see https://eslint.style/rules/jsx-closing-tag-location
   */
  'jsx-closing-tag-location': JsxClosingTagLocationRuleOptions
  /**
   * Disallow unnecessary JSX expressions when literals alone are sufficient or enforce JSX expressions on literals in JSX children or attributes
   * @see https://eslint.style/rules/jsx-curly-brace-presence
   */
  'jsx-curly-brace-presence': JsxCurlyBracePresenceRuleOptions
  /**
   * Enforce consistent linebreaks in curly braces in JSX attributes and expressions
   * @see https://eslint.style/rules/jsx-curly-newline
   */
  'jsx-curly-newline': JsxCurlyNewlineRuleOptions
  /**
   * Enforce or disallow spaces inside of curly braces in JSX attributes and expressions
   * @see https://eslint.style/rules/jsx-curly-spacing
   */
  'jsx-curly-spacing': JsxCurlySpacingRuleOptions
  /**
   * Enforce or disallow spaces around equal signs in JSX attributes
   * @see https://eslint.style/rules/jsx-equals-spacing
   */
  'jsx-equals-spacing': JsxEqualsSpacingRuleOptions
  /**
   * Enforce proper position of the first property in JSX
   * @see https://eslint.style/rules/jsx-first-prop-new-line
   */
  'jsx-first-prop-new-line': JsxFirstPropNewLineRuleOptions
  /**
   * Enforce line breaks before and after JSX elements when they are used as arguments to a function.
   * @see https://eslint.style/rules/jsx-function-call-newline
   */
  'jsx-function-call-newline': JsxFunctionCallNewlineRuleOptions
  /**
   * Enforce JSX indentation. Deprecated, use `indent` rule instead.
   * @see https://eslint.style/rules/jsx-indent
   */
  'jsx-indent': JsxIndentRuleOptions
  /**
   * Enforce props indentation in JSX
   * @see https://eslint.style/rules/jsx-indent-props
   */
  'jsx-indent-props': JsxIndentPropsRuleOptions
  /**
   * Enforce maximum of props on a single line in JSX
   * @see https://eslint.style/rules/jsx-max-props-per-line
   */
  'jsx-max-props-per-line': JsxMaxPropsPerLineRuleOptions
  /**
   * Require or prevent a new line after jsx elements and expressions.
   * @see https://eslint.style/rules/jsx-newline
   */
  'jsx-newline': JsxNewlineRuleOptions
  /**
   * Require one JSX element per line
   * @see https://eslint.style/rules/jsx-one-expression-per-line
   */
  'jsx-one-expression-per-line': JsxOneExpressionPerLineRuleOptions
  /**
   * Enforce PascalCase for user-defined JSX components
   * @see https://eslint.style/rules/jsx-pascal-case
   */
  'jsx-pascal-case': JsxPascalCaseRuleOptions
  /**
   * Disallow multiple spaces between inline JSX props
   * @see https://eslint.style/rules/jsx-props-no-multi-spaces
   */
  'jsx-props-no-multi-spaces': JsxPropsNoMultiSpacesRuleOptions
  /**
   * Enforce the consistent use of either double or single quotes in JSX attributes
   * @see https://eslint.style/rules/jsx-quotes
   */
  'jsx-quotes': JsxQuotesRuleOptions
  /**
   * Disallow extra closing tags for components without children
   * @see https://eslint.style/rules/jsx-self-closing-comp
   */
  'jsx-self-closing-comp': JsxSelfClosingCompRuleOptions
  /**
   * Enforce props alphabetical sorting
   * @see https://eslint.style/rules/jsx-sort-props
   */
  'jsx-sort-props': JsxSortPropsRuleOptions
  /**
   * Enforce whitespace in and around the JSX opening and closing brackets
   * @see https://eslint.style/rules/jsx-tag-spacing
   */
  'jsx-tag-spacing': JsxTagSpacingRuleOptions
  /**
   * Disallow missing parentheses around multiline JSX
   * @see https://eslint.style/rules/jsx-wrap-multilines
   */
  'jsx-wrap-multilines': JsxWrapMultilinesRuleOptions
  /**
   * Enforce consistent spacing between property names and type annotations in types and interfaces
   * @see https://eslint.style/rules/key-spacing
   */
  'key-spacing': KeySpacingRuleOptions
  /**
   * Enforce consistent spacing before and after keywords
   * @see https://eslint.style/rules/keyword-spacing
   */
  'keyword-spacing': KeywordSpacingRuleOptions
  /**
   * Enforce position of line comments
   * @see https://eslint.style/rules/line-comment-position
   */
  'line-comment-position': LineCommentPositionRuleOptions
  /**
   * Enforce consistent linebreak style
   * @see https://eslint.style/rules/linebreak-style
   */
  'linebreak-style': LinebreakStyleRuleOptions
  /**
   * Require empty lines around comments
   * @see https://eslint.style/rules/lines-around-comment
   */
  'lines-around-comment': LinesAroundCommentRuleOptions
  /**
   * Require or disallow an empty line between class members
   * @see https://eslint.style/rules/lines-between-class-members
   */
  'lines-between-class-members': LinesBetweenClassMembersRuleOptions
  /**
   * Enforce a maximum line length
   * @see https://eslint.style/rules/max-len
   */
  'max-len': MaxLenRuleOptions
  /**
   * Enforce a maximum number of statements allowed per line
   * @see https://eslint.style/rules/max-statements-per-line
   */
  'max-statements-per-line': MaxStatementsPerLineRuleOptions
  /**
   * Require a specific member delimiter style for interfaces and type literals
   * @see https://eslint.style/rules/member-delimiter-style
   */
  'member-delimiter-style': MemberDelimiterStyleRuleOptions
  /**
   * Enforce a particular style for multiline comments
   * @see https://eslint.style/rules/multiline-comment-style
   */
  'multiline-comment-style': MultilineCommentStyleRuleOptions
  /**
   * Enforce newlines between operands of ternary expressions
   * @see https://eslint.style/rules/multiline-ternary
   */
  'multiline-ternary': MultilineTernaryRuleOptions
  /**
   * Enforce or disallow parentheses when invoking a constructor with no arguments
   * @see https://eslint.style/rules/new-parens
   */
  'new-parens': NewParensRuleOptions
  /**
   * Require a newline after each call in a method chain
   * @see https://eslint.style/rules/newline-per-chained-call
   */
  'newline-per-chained-call': NewlinePerChainedCallRuleOptions
  /**
   * Disallow arrow functions where they could be confused with comparisons
   * @see https://eslint.style/rules/no-confusing-arrow
   */
  'no-confusing-arrow': NoConfusingArrowRuleOptions
  /**
   * Disallow unnecessary parentheses
   * @see https://eslint.style/rules/no-extra-parens
   */
  'no-extra-parens': NoExtraParensRuleOptions
  /**
   * Disallow unnecessary semicolons
   * @see https://eslint.style/rules/no-extra-semi
   */
  'no-extra-semi': NoExtraSemiRuleOptions
  /**
   * Disallow leading or trailing decimal points in numeric literals
   * @see https://eslint.style/rules/no-floating-decimal
   */
  'no-floating-decimal': NoFloatingDecimalRuleOptions
  /**
   * Disallow mixed binary operators
   * @see https://eslint.style/rules/no-mixed-operators
   */
  'no-mixed-operators': NoMixedOperatorsRuleOptions
  /**
   * Disallow mixed spaces and tabs for indentation
   * @see https://eslint.style/rules/no-mixed-spaces-and-tabs
   */
  'no-mixed-spaces-and-tabs': NoMixedSpacesAndTabsRuleOptions
  /**
   * Disallow multiple spaces
   * @see https://eslint.style/rules/no-multi-spaces
   */
  'no-multi-spaces': NoMultiSpacesRuleOptions
  /**
   * Disallow multiple empty lines
   * @see https://eslint.style/rules/no-multiple-empty-lines
   */
  'no-multiple-empty-lines': NoMultipleEmptyLinesRuleOptions
  /**
   * Disallow all tabs
   * @see https://eslint.style/rules/no-tabs
   */
  'no-tabs': NoTabsRuleOptions
  /**
   * Disallow trailing whitespace at the end of lines
   * @see https://eslint.style/rules/no-trailing-spaces
   */
  'no-trailing-spaces': NoTrailingSpacesRuleOptions
  /**
   * Disallow whitespace before properties
   * @see https://eslint.style/rules/no-whitespace-before-property
   */
  'no-whitespace-before-property': NoWhitespaceBeforePropertyRuleOptions
  /**
   * Enforce the location of single-line statements
   * @see https://eslint.style/rules/nonblock-statement-body-position
   */
  'nonblock-statement-body-position': NonblockStatementBodyPositionRuleOptions
  /**
   * Enforce consistent line breaks after opening and before closing braces
   * @see https://eslint.style/rules/object-curly-newline
   */
  'object-curly-newline': ObjectCurlyNewlineRuleOptions
  /**
   * Enforce consistent spacing inside braces
   * @see https://eslint.style/rules/object-curly-spacing
   */
  'object-curly-spacing': ObjectCurlySpacingRuleOptions
  /**
   * Enforce placing object properties on separate lines
   * @see https://eslint.style/rules/object-property-newline
   */
  'object-property-newline': ObjectPropertyNewlineRuleOptions
  /**
   * Require or disallow newlines around variable declarations
   * @see https://eslint.style/rules/one-var-declaration-per-line
   */
  'one-var-declaration-per-line': OneVarDeclarationPerLineRuleOptions
  /**
   * Enforce consistent linebreak style for operators
   * @see https://eslint.style/rules/operator-linebreak
   */
  'operator-linebreak': OperatorLinebreakRuleOptions
  /**
   * Require or disallow padding within blocks
   * @see https://eslint.style/rules/padded-blocks
   */
  'padded-blocks': PaddedBlocksRuleOptions
  /**
   * Require or disallow padding lines between statements
   * @see https://eslint.style/rules/padding-line-between-statements
   */
  'padding-line-between-statements': PaddingLineBetweenStatementsRuleOptions
  /**
   * Require quotes around object literal, type literal, interfaces and enums property names
   * @see https://eslint.style/rules/quote-props
   */
  'quote-props': QuotePropsRuleOptions
  /**
   * Enforce the consistent use of either backticks, double, or single quotes
   * @see https://eslint.style/rules/quotes
   */
  'quotes': QuotesRuleOptions
  /**
   * Enforce spacing between rest and spread operators and their expressions
   * @see https://eslint.style/rules/rest-spread-spacing
   */
  'rest-spread-spacing': RestSpreadSpacingRuleOptions
  /**
   * Require or disallow semicolons instead of ASI
   * @see https://eslint.style/rules/semi
   */
  'semi': SemiRuleOptions
  /**
   * Enforce consistent spacing before and after semicolons
   * @see https://eslint.style/rules/semi-spacing
   */
  'semi-spacing': SemiSpacingRuleOptions
  /**
   * Enforce location of semicolons
   * @see https://eslint.style/rules/semi-style
   */
  'semi-style': SemiStyleRuleOptions
  /**
   * Enforce consistent spacing before blocks
   * @see https://eslint.style/rules/space-before-blocks
   */
  'space-before-blocks': SpaceBeforeBlocksRuleOptions
  /**
   * Enforce consistent spacing before function parenthesis
   * @see https://eslint.style/rules/space-before-function-paren
   */
  'space-before-function-paren': SpaceBeforeFunctionParenRuleOptions
  /**
   * Enforce consistent spacing inside parentheses
   * @see https://eslint.style/rules/space-in-parens
   */
  'space-in-parens': SpaceInParensRuleOptions
  /**
   * Require spacing around infix operators
   * @see https://eslint.style/rules/space-infix-ops
   */
  'space-infix-ops': SpaceInfixOpsRuleOptions
  /**
   * Enforce consistent spacing before or after unary operators
   * @see https://eslint.style/rules/space-unary-ops
   */
  'space-unary-ops': SpaceUnaryOpsRuleOptions
  /**
   * Enforce consistent spacing after the `//` or `/*` in a comment
   * @see https://eslint.style/rules/spaced-comment
   */
  'spaced-comment': SpacedCommentRuleOptions
  /**
   * Enforce spacing around colons of switch statements
   * @see https://eslint.style/rules/switch-colon-spacing
   */
  'switch-colon-spacing': SwitchColonSpacingRuleOptions
  /**
   * Require or disallow spacing around embedded expressions of template strings
   * @see https://eslint.style/rules/template-curly-spacing
   */
  'template-curly-spacing': TemplateCurlySpacingRuleOptions
  /**
   * Require or disallow spacing between template tags and their literals
   * @see https://eslint.style/rules/template-tag-spacing
   */
  'template-tag-spacing': TemplateTagSpacingRuleOptions
  /**
   * Require consistent spacing around type annotations
   * @see https://eslint.style/rules/type-annotation-spacing
   */
  'type-annotation-spacing': TypeAnnotationSpacingRuleOptions
  /**
   * Enforces consistent spacing inside TypeScript type generics
   * @see https://eslint.style/rules/type-generic-spacing
   */
  'type-generic-spacing': TypeGenericSpacingRuleOptions
  /**
   * Expect space before the type declaration in the named tuple
   * @see https://eslint.style/rules/type-named-tuple-spacing
   */
  'type-named-tuple-spacing': TypeNamedTupleSpacingRuleOptions
  /**
   * Require parentheses around immediate `function` invocations
   * @see https://eslint.style/rules/wrap-iife
   */
  'wrap-iife': WrapIifeRuleOptions
  /**
   * Require parenthesis around regex literals
   * @see https://eslint.style/rules/wrap-regex
   */
  'wrap-regex': WrapRegexRuleOptions
  /**
   * Require or disallow spacing around the `*` in `yield*` expressions
   * @see https://eslint.style/rules/yield-star-spacing
   */
  'yield-star-spacing': YieldStarSpacingRuleOptions
}

export type { RuleOptions, UnprefixedRuleOptions };
