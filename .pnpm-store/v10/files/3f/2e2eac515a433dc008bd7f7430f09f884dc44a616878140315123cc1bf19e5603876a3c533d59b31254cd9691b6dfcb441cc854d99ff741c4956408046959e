//#region rules/array-bracket-newline/types.d.ts

type ArrayBracketNewlineSchema0 = ('always' | 'never' | 'consistent') | {
  multiline?: boolean;
  minItems?: number | null;
};
type ArrayBracketNewlineRuleOptions = [ArrayBracketNewlineSchema0?];
//#endregion
//#region rules/array-bracket-spacing/types.d.ts

type ArrayBracketSpacingSchema0 = 'always' | 'never';
interface ArrayBracketSpacingSchema1 {
  singleValue?: boolean;
  objectsInArrays?: boolean;
  arraysInArrays?: boolean;
}
type ArrayBracketSpacingRuleOptions = [ArrayBracketSpacingSchema0?, ArrayBracketSpacingSchema1?];
//#endregion
//#region rules/array-element-newline/types.d.ts

type ArrayElementNewlineSchema0 = [] | [BasicConfig | {
  ArrayExpression?: BasicConfig;
  ArrayPattern?: BasicConfig;
}];
type BasicConfig = ('always' | 'never' | 'consistent') | {
  consistent?: boolean;
  multiline?: boolean;
  minItems?: number | null;
};
type ArrayElementNewlineRuleOptions = ArrayElementNewlineSchema0;
//#endregion
//#region rules/arrow-parens/types.d.ts

type ArrowParensSchema0 = 'always' | 'as-needed';
interface ArrowParensSchema1 {
  requireForBlockBody?: boolean;
}
type ArrowParensRuleOptions = [ArrowParensSchema0?, ArrowParensSchema1?];
//#endregion
//#region rules/arrow-spacing/types.d.ts

interface ArrowSpacingSchema0 {
  before?: boolean;
  after?: boolean;
}
type ArrowSpacingRuleOptions = [ArrowSpacingSchema0?];
//#endregion
//#region rules/block-spacing/types.d.ts

type BlockSpacingSchema0 = 'always' | 'never';
type BlockSpacingRuleOptions = [BlockSpacingSchema0?];
//#endregion
//#region rules/brace-style/types.d.ts

type BraceStyleSchema0 = '1tbs' | 'stroustrup' | 'allman';
interface BraceStyleSchema1 {
  allowSingleLine?: boolean;
}
type BraceStyleRuleOptions = [BraceStyleSchema0?, BraceStyleSchema1?];
//#endregion
//#region rules/comma-dangle/types.d.ts

type CommaDangleSchema0 = [] | [Value | {
  arrays?: ValueWithIgnore;
  objects?: ValueWithIgnore;
  imports?: ValueWithIgnore;
  exports?: ValueWithIgnore;
  functions?: ValueWithIgnore;
  importAttributes?: ValueWithIgnore;
  dynamicImports?: ValueWithIgnore;
  enums?: ValueWithIgnore;
  generics?: ValueWithIgnore;
  tuples?: ValueWithIgnore;
}];
type Value = 'always-multiline' | 'always' | 'never' | 'only-multiline';
type ValueWithIgnore = 'always-multiline' | 'always' | 'never' | 'only-multiline' | 'ignore';
type CommaDangleRuleOptions = CommaDangleSchema0;
//#endregion
//#region rules/comma-spacing/types.d.ts

interface CommaSpacingSchema0 {
  before?: boolean;
  after?: boolean;
}
type CommaSpacingRuleOptions = [CommaSpacingSchema0?];
//#endregion
//#region rules/comma-style/types.d.ts

type CommaStyleSchema0 = 'first' | 'last';
interface CommaStyleSchema1 {
  exceptions?: {
    [k: string]: boolean;
  };
}
type CommaStyleRuleOptions = [CommaStyleSchema0?, CommaStyleSchema1?];
//#endregion
//#region rules/computed-property-spacing/types.d.ts

type ComputedPropertySpacingSchema0 = 'always' | 'never';
interface ComputedPropertySpacingSchema1 {
  enforceForClassMembers?: boolean;
}
type ComputedPropertySpacingRuleOptions = [ComputedPropertySpacingSchema0?, ComputedPropertySpacingSchema1?];
//#endregion
//#region rules/curly-newline/types.d.ts

type CurlyNewlineSchema0 = ('always' | 'never') | {
  IfStatementConsequent?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  IfStatementAlternative?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  DoWhileStatement?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  ForInStatement?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  ForOfStatement?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  ForStatement?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  WhileStatement?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  SwitchStatement?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  SwitchCase?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  TryStatementBlock?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  TryStatementHandler?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  TryStatementFinalizer?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  BlockStatement?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  ArrowFunctionExpression?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  FunctionDeclaration?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  FunctionExpression?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  Property?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  ClassBody?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  StaticBlock?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  WithStatement?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  TSModuleBlock?: ('always' | 'never') | {
    multiline?: boolean;
    minElements?: number;
    consistent?: boolean;
  };
  multiline?: boolean;
  minElements?: number;
  consistent?: boolean;
};
type CurlyNewlineRuleOptions = [CurlyNewlineSchema0?];
//#endregion
//#region rules/dot-location/types.d.ts

type DotLocationSchema0 = 'object' | 'property';
type DotLocationRuleOptions = [DotLocationSchema0?];
//#endregion
//#region rules/eol-last/types.d.ts

type EolLastSchema0 = 'always' | 'never' | 'unix' | 'windows';
type EolLastRuleOptions = [EolLastSchema0?];
//#endregion
//#region rules/function-call-argument-newline/types.d.ts

type FunctionCallArgumentNewlineSchema0 = 'always' | 'never' | 'consistent';
type FunctionCallArgumentNewlineRuleOptions = [FunctionCallArgumentNewlineSchema0?];
//#endregion
//#region rules/function-call-spacing/types.d.ts

type FunctionCallSpacingSchema0 = [] | ['never'] | [] | ['always'] | ['always', {
  allowNewlines?: boolean;
  optionalChain?: {
    before?: boolean;
    after?: boolean;
  };
}];
type FunctionCallSpacingRuleOptions = FunctionCallSpacingSchema0;
//#endregion
//#region rules/function-paren-newline/types.d.ts

type FunctionParenNewlineSchema0 = ('always' | 'never' | 'consistent' | 'multiline' | 'multiline-arguments') | {
  minItems?: number;
};
type FunctionParenNewlineRuleOptions = [FunctionParenNewlineSchema0?];
//#endregion
//#region rules/generator-star-spacing/types.d.ts

type GeneratorStarSpacingSchema0 = ('before' | 'after' | 'both' | 'neither') | {
  before?: boolean;
  after?: boolean;
  named?: ('before' | 'after' | 'both' | 'neither') | {
    before?: boolean;
    after?: boolean;
  };
  anonymous?: ('before' | 'after' | 'both' | 'neither') | {
    before?: boolean;
    after?: boolean;
  };
  method?: ('before' | 'after' | 'both' | 'neither') | {
    before?: boolean;
    after?: boolean;
  };
  shorthand?: ('before' | 'after' | 'both' | 'neither') | {
    before?: boolean;
    after?: boolean;
  };
};
type GeneratorStarSpacingRuleOptions = [GeneratorStarSpacingSchema0?];
//#endregion
//#region rules/implicit-arrow-linebreak/types.d.ts

type ImplicitArrowLinebreakSchema0 = 'beside' | 'below';
type ImplicitArrowLinebreakRuleOptions = [ImplicitArrowLinebreakSchema0?];
//#endregion
//#region rules/indent-binary-ops/types.d.ts

type IndentBinaryOpsSchema0 = number | 'tab';
type IndentBinaryOpsRuleOptions = [IndentBinaryOpsSchema0?];
//#endregion
//#region rules/indent/types.d.ts

type IndentSchema0 = 'tab' | number;
interface IndentSchema1 {
  SwitchCase?: number;
  VariableDeclarator?: (number | ('first' | 'off')) | {
    var?: number | ('first' | 'off');
    let?: number | ('first' | 'off');
    const?: number | ('first' | 'off');
    using?: number | ('first' | 'off');
  };
  assignmentOperator?: number | 'off';
  outerIIFEBody?: number | 'off';
  MemberExpression?: number | 'off';
  FunctionDeclaration?: {
    parameters?: number | ('first' | 'off');
    body?: number;
    returnType?: number;
  };
  FunctionExpression?: {
    parameters?: number | ('first' | 'off');
    body?: number;
    returnType?: number;
  };
  StaticBlock?: {
    body?: number;
  };
  CallExpression?: {
    arguments?: number | ('first' | 'off');
  };
  ArrayExpression?: number | ('first' | 'off');
  ObjectExpression?: number | ('first' | 'off');
  ImportDeclaration?: number | ('first' | 'off');
  flatTernaryExpressions?: boolean;
  offsetTernaryExpressions?: boolean | {
    CallExpression?: boolean;
    AwaitExpression?: boolean;
    NewExpression?: boolean;
  };
  offsetTernaryExpressionsOffsetCallExpressions?: boolean;
  ignoredNodes?: string[];
  ignoreComments?: boolean;
  tabLength?: number;
}
type IndentRuleOptions = [IndentSchema0?, IndentSchema1?];
//#endregion
//#region rules/jsx-child-element-spacing/types.d.ts

type JsxChildElementSpacingRuleOptions = [];
//#endregion
//#region rules/jsx-closing-bracket-location/types.d.ts

type JsxClosingBracketLocationSchema0 = ('after-props' | 'props-aligned' | 'tag-aligned' | 'line-aligned') | {
  location?: 'after-props' | 'props-aligned' | 'tag-aligned' | 'line-aligned';
} | {
  nonEmpty?: ('after-props' | 'props-aligned' | 'tag-aligned' | 'line-aligned') | false;
  selfClosing?: ('after-props' | 'props-aligned' | 'tag-aligned' | 'line-aligned') | false;
};
type JsxClosingBracketLocationRuleOptions = [JsxClosingBracketLocationSchema0?];
//#endregion
//#region rules/jsx-closing-tag-location/types.d.ts

type JsxClosingTagLocationSchema0 = 'tag-aligned' | 'line-aligned';
type JsxClosingTagLocationRuleOptions = [JsxClosingTagLocationSchema0?];
//#endregion
//#region rules/jsx-curly-brace-presence/types.d.ts

type JsxCurlyBracePresenceSchema0 = {
  props?: 'always' | 'never' | 'ignore';
  children?: 'always' | 'never' | 'ignore';
  propElementValues?: 'always' | 'never' | 'ignore';
} | ('always' | 'never' | 'ignore');
type JsxCurlyBracePresenceRuleOptions = [JsxCurlyBracePresenceSchema0?];
//#endregion
//#region rules/jsx-curly-newline/types.d.ts

type JsxCurlyNewlineSchema0 = ('consistent' | 'never') | {
  singleline?: 'consistent' | 'require' | 'forbid';
  multiline?: 'consistent' | 'require' | 'forbid';
};
type JsxCurlyNewlineRuleOptions = [JsxCurlyNewlineSchema0?];
//#endregion
//#region rules/jsx-curly-spacing/types.d.ts

type JsxCurlySpacingSchema0 = [] | [{
  when?: 'always' | 'never';
  allowMultiline?: boolean;
  spacing?: {
    objectLiterals?: 'always' | 'never';
  };
  attributes?: {
    when?: 'always' | 'never';
    allowMultiline?: boolean;
    spacing?: {
      objectLiterals?: 'always' | 'never';
    };
  } | boolean;
  children?: {
    when?: 'always' | 'never';
    allowMultiline?: boolean;
    spacing?: {
      objectLiterals?: 'always' | 'never';
    };
  } | boolean;
} | ('always' | 'never')] | [({
  when?: 'always' | 'never';
  allowMultiline?: boolean;
  spacing?: {
    objectLiterals?: 'always' | 'never';
  };
  attributes?: {
    when?: 'always' | 'never';
    allowMultiline?: boolean;
    spacing?: {
      objectLiterals?: 'always' | 'never';
    };
  } | boolean;
  children?: {
    when?: 'always' | 'never';
    allowMultiline?: boolean;
    spacing?: {
      objectLiterals?: 'always' | 'never';
    };
  } | boolean;
} | ('always' | 'never')), {
  allowMultiline?: boolean;
  spacing?: {
    objectLiterals?: 'always' | 'never';
  };
}];
type JsxCurlySpacingRuleOptions = JsxCurlySpacingSchema0;
//#endregion
//#region rules/jsx-equals-spacing/types.d.ts

type JsxEqualsSpacingSchema0 = 'always' | 'never';
type JsxEqualsSpacingRuleOptions = [JsxEqualsSpacingSchema0?];
//#endregion
//#region rules/jsx-first-prop-new-line/types.d.ts

type JsxFirstPropNewLineSchema0 = 'always' | 'never' | 'multiline' | 'multiline-multiprop' | 'multiprop';
type JsxFirstPropNewLineRuleOptions = [JsxFirstPropNewLineSchema0?];
//#endregion
//#region rules/jsx-function-call-newline/types.d.ts

type JsxFunctionCallNewlineSchema0 = 'always' | 'multiline';
type JsxFunctionCallNewlineRuleOptions = [JsxFunctionCallNewlineSchema0?];
//#endregion
//#region rules/jsx-indent-props/types.d.ts

type JsxIndentPropsSchema0 = ('tab' | 'first') | number | {
  indentMode?: ('tab' | 'first') | number;
  ignoreTernaryOperator?: boolean;
};
type JsxIndentPropsRuleOptions = [JsxIndentPropsSchema0?];
//#endregion
//#region rules/jsx-indent/types.d.ts

type JsxIndentSchema0 = 'tab' | number;
interface JsxIndentSchema1 {
  checkAttributes?: boolean;
  indentLogicalExpressions?: boolean;
}
type JsxIndentRuleOptions = [JsxIndentSchema0?, JsxIndentSchema1?];
//#endregion
//#region rules/jsx-max-props-per-line/types.d.ts

type JsxMaxPropsPerLineSchema0 = {
  maximum?: {
    single?: number;
    multi?: number;
  };
} | {
  maximum?: number;
  when?: 'always' | 'multiline';
};
type JsxMaxPropsPerLineRuleOptions = [JsxMaxPropsPerLineSchema0?];
//#endregion
//#region rules/jsx-newline/types.d.ts

interface JsxNewlineSchema0 {
  prevent?: boolean;
  allowMultilines?: boolean;
}
type JsxNewlineRuleOptions = [JsxNewlineSchema0?];
//#endregion
//#region rules/jsx-one-expression-per-line/types.d.ts

interface JsxOneExpressionPerLineSchema0 {
  allow?: 'none' | 'literal' | 'single-child' | 'single-line' | 'non-jsx';
}
type JsxOneExpressionPerLineRuleOptions = [JsxOneExpressionPerLineSchema0?];
//#endregion
//#region rules/jsx-pascal-case/types.d.ts

interface JsxPascalCaseSchema0 {
  allowAllCaps?: boolean;
  allowLeadingUnderscore?: boolean;
  allowNamespace?: boolean;
  ignore?: string[];
}
type JsxPascalCaseRuleOptions = [JsxPascalCaseSchema0?];
//#endregion
//#region rules/jsx-props-no-multi-spaces/types.d.ts

type JsxPropsNoMultiSpacesRuleOptions = [];
//#endregion
//#region rules/jsx-props-style/types.d.ts

interface JsxPropsStyleSchema0 {
  singleLine?: {
    maxItems?: number;
  };
  multiLine?: {
    minItems?: number;
    maxItemsPerLine?: number;
  };
}
type JsxPropsStyleRuleOptions = [JsxPropsStyleSchema0?];
//#endregion
//#region rules/jsx-quotes/types.d.ts

type JsxQuotesSchema0 = 'prefer-single' | 'prefer-double';
type JsxQuotesRuleOptions = [JsxQuotesSchema0?];
//#endregion
//#region rules/jsx-self-closing-comp/types.d.ts

interface JsxSelfClosingCompSchema0 {
  component?: boolean;
  html?: boolean;
}
type JsxSelfClosingCompRuleOptions = [JsxSelfClosingCompSchema0?];
//#endregion
//#region rules/jsx-sort-props/types.d.ts

interface JsxSortPropsSchema0 {
  callbacksLast?: boolean;
  shorthandFirst?: boolean;
  shorthandLast?: boolean;
  multiline?: 'ignore' | 'first' | 'last';
  ignoreCase?: boolean;
  noSortAlphabetically?: boolean;
  reservedFirst?: string[] | boolean;
  reservedLast?: string[];
  locale?: string;
}
type JsxSortPropsRuleOptions = [JsxSortPropsSchema0?];
//#endregion
//#region rules/jsx-tag-spacing/types.d.ts

interface JsxTagSpacingSchema0 {
  closingSlash?: 'always' | 'never' | 'allow';
  beforeSelfClosing?: 'always' | 'proportional-always' | 'never' | 'allow';
  afterOpening?: 'always' | 'allow-multiline' | 'never' | 'allow';
  beforeClosing?: 'always' | 'proportional-always' | 'never' | 'allow';
}
type JsxTagSpacingRuleOptions = [JsxTagSpacingSchema0?];
//#endregion
//#region rules/jsx-wrap-multilines/types.d.ts

interface JsxWrapMultilinesSchema0 {
  declaration?: true | false | 'ignore' | 'parens' | 'parens-new-line';
  assignment?: true | false | 'ignore' | 'parens' | 'parens-new-line';
  return?: true | false | 'ignore' | 'parens' | 'parens-new-line';
  arrow?: true | false | 'ignore' | 'parens' | 'parens-new-line';
  condition?: true | false | 'ignore' | 'parens' | 'parens-new-line';
  logical?: true | false | 'ignore' | 'parens' | 'parens-new-line';
  prop?: true | false | 'ignore' | 'parens' | 'parens-new-line';
  propertyValue?: true | false | 'ignore' | 'parens' | 'parens-new-line';
}
type JsxWrapMultilinesRuleOptions = [JsxWrapMultilinesSchema0?];
//#endregion
//#region rules/key-spacing/types.d.ts

type KeySpacingSchema0 = {
  align?: ('colon' | 'value') | {
    mode?: 'strict' | 'minimum';
    on?: 'colon' | 'value';
    beforeColon?: boolean;
    afterColon?: boolean;
  };
  mode?: 'strict' | 'minimum';
  beforeColon?: boolean;
  afterColon?: boolean;
  ignoredNodes?: ('ObjectExpression' | 'ObjectPattern' | 'ImportDeclaration' | 'ExportNamedDeclaration' | 'ExportAllDeclaration' | 'TSTypeLiteral' | 'TSInterfaceBody' | 'ClassBody')[];
} | {
  singleLine?: {
    mode?: 'strict' | 'minimum';
    beforeColon?: boolean;
    afterColon?: boolean;
  };
  multiLine?: {
    align?: ('colon' | 'value') | {
      mode?: 'strict' | 'minimum';
      on?: 'colon' | 'value';
      beforeColon?: boolean;
      afterColon?: boolean;
    };
    mode?: 'strict' | 'minimum';
    beforeColon?: boolean;
    afterColon?: boolean;
  };
} | {
  singleLine?: {
    mode?: 'strict' | 'minimum';
    beforeColon?: boolean;
    afterColon?: boolean;
  };
  multiLine?: {
    mode?: 'strict' | 'minimum';
    beforeColon?: boolean;
    afterColon?: boolean;
  };
  align?: {
    mode?: 'strict' | 'minimum';
    on?: 'colon' | 'value';
    beforeColon?: boolean;
    afterColon?: boolean;
  };
};
type KeySpacingRuleOptions = [KeySpacingSchema0?];
//#endregion
//#region rules/keyword-spacing/types.d.ts

interface KeywordSpacingSchema0 {
  before?: boolean;
  after?: boolean;
  overrides?: {
    abstract?: {
      before?: boolean;
      after?: boolean;
    };
    boolean?: {
      before?: boolean;
      after?: boolean;
    };
    break?: {
      before?: boolean;
      after?: boolean;
    };
    byte?: {
      before?: boolean;
      after?: boolean;
    };
    case?: {
      before?: boolean;
      after?: boolean;
    };
    catch?: {
      before?: boolean;
      after?: boolean;
    };
    char?: {
      before?: boolean;
      after?: boolean;
    };
    class?: {
      before?: boolean;
      after?: boolean;
    };
    const?: {
      before?: boolean;
      after?: boolean;
    };
    continue?: {
      before?: boolean;
      after?: boolean;
    };
    debugger?: {
      before?: boolean;
      after?: boolean;
    };
    default?: {
      before?: boolean;
      after?: boolean;
    };
    delete?: {
      before?: boolean;
      after?: boolean;
    };
    do?: {
      before?: boolean;
      after?: boolean;
    };
    double?: {
      before?: boolean;
      after?: boolean;
    };
    else?: {
      before?: boolean;
      after?: boolean;
    };
    enum?: {
      before?: boolean;
      after?: boolean;
    };
    export?: {
      before?: boolean;
      after?: boolean;
    };
    extends?: {
      before?: boolean;
      after?: boolean;
    };
    false?: {
      before?: boolean;
      after?: boolean;
    };
    final?: {
      before?: boolean;
      after?: boolean;
    };
    finally?: {
      before?: boolean;
      after?: boolean;
    };
    float?: {
      before?: boolean;
      after?: boolean;
    };
    for?: {
      before?: boolean;
      after?: boolean;
    };
    function?: {
      before?: boolean;
      after?: boolean;
    };
    goto?: {
      before?: boolean;
      after?: boolean;
    };
    if?: {
      before?: boolean;
      after?: boolean;
    };
    implements?: {
      before?: boolean;
      after?: boolean;
    };
    import?: {
      before?: boolean;
      after?: boolean;
    };
    in?: {
      before?: boolean;
      after?: boolean;
    };
    instanceof?: {
      before?: boolean;
      after?: boolean;
    };
    int?: {
      before?: boolean;
      after?: boolean;
    };
    interface?: {
      before?: boolean;
      after?: boolean;
    };
    long?: {
      before?: boolean;
      after?: boolean;
    };
    native?: {
      before?: boolean;
      after?: boolean;
    };
    new?: {
      before?: boolean;
      after?: boolean;
    };
    null?: {
      before?: boolean;
      after?: boolean;
    };
    package?: {
      before?: boolean;
      after?: boolean;
    };
    private?: {
      before?: boolean;
      after?: boolean;
    };
    protected?: {
      before?: boolean;
      after?: boolean;
    };
    public?: {
      before?: boolean;
      after?: boolean;
    };
    return?: {
      before?: boolean;
      after?: boolean;
    };
    short?: {
      before?: boolean;
      after?: boolean;
    };
    static?: {
      before?: boolean;
      after?: boolean;
    };
    super?: {
      before?: boolean;
      after?: boolean;
    };
    switch?: {
      before?: boolean;
      after?: boolean;
    };
    synchronized?: {
      before?: boolean;
      after?: boolean;
    };
    this?: {
      before?: boolean;
      after?: boolean;
    };
    throw?: {
      before?: boolean;
      after?: boolean;
    };
    throws?: {
      before?: boolean;
      after?: boolean;
    };
    transient?: {
      before?: boolean;
      after?: boolean;
    };
    true?: {
      before?: boolean;
      after?: boolean;
    };
    try?: {
      before?: boolean;
      after?: boolean;
    };
    typeof?: {
      before?: boolean;
      after?: boolean;
    };
    var?: {
      before?: boolean;
      after?: boolean;
    };
    void?: {
      before?: boolean;
      after?: boolean;
    };
    volatile?: {
      before?: boolean;
      after?: boolean;
    };
    while?: {
      before?: boolean;
      after?: boolean;
    };
    with?: {
      before?: boolean;
      after?: boolean;
    };
    arguments?: {
      before?: boolean;
      after?: boolean;
    };
    as?: {
      before?: boolean;
      after?: boolean;
    };
    async?: {
      before?: boolean;
      after?: boolean;
    };
    await?: {
      before?: boolean;
      after?: boolean;
    };
    eval?: {
      before?: boolean;
      after?: boolean;
    };
    from?: {
      before?: boolean;
      after?: boolean;
    };
    get?: {
      before?: boolean;
      after?: boolean;
    };
    let?: {
      before?: boolean;
      after?: boolean;
    };
    of?: {
      before?: boolean;
      after?: boolean;
    };
    set?: {
      before?: boolean;
      after?: boolean;
    };
    type?: {
      before?: boolean;
      after?: boolean;
    };
    using?: {
      before?: boolean;
      after?: boolean;
    };
    yield?: {
      before?: boolean;
      after?: boolean;
    };
    accessor?: {
      before?: boolean;
      after?: boolean;
    };
    satisfies?: {
      before?: boolean;
      after?: boolean;
    };
  };
}
type KeywordSpacingRuleOptions = [KeywordSpacingSchema0?];
//#endregion
//#region rules/line-comment-position/types.d.ts

type LineCommentPositionSchema0 = ('above' | 'beside') | {
  position?: 'above' | 'beside';
  ignorePattern?: string;
  applyDefaultPatterns?: boolean;
  applyDefaultIgnorePatterns?: boolean;
};
type LineCommentPositionRuleOptions = [LineCommentPositionSchema0?];
//#endregion
//#region rules/linebreak-style/types.d.ts

type LinebreakStyleSchema0 = 'unix' | 'windows';
type LinebreakStyleRuleOptions = [LinebreakStyleSchema0?];
//#endregion
//#region rules/lines-around-comment/types.d.ts

interface LinesAroundCommentSchema0 {
  beforeBlockComment?: boolean;
  afterBlockComment?: boolean;
  beforeLineComment?: boolean;
  afterLineComment?: boolean;
  allowBlockStart?: boolean;
  allowBlockEnd?: boolean;
  allowClassStart?: boolean;
  allowClassEnd?: boolean;
  allowObjectStart?: boolean;
  allowObjectEnd?: boolean;
  allowArrayStart?: boolean;
  allowArrayEnd?: boolean;
  allowInterfaceStart?: boolean;
  allowInterfaceEnd?: boolean;
  allowTypeStart?: boolean;
  allowTypeEnd?: boolean;
  allowEnumStart?: boolean;
  allowEnumEnd?: boolean;
  allowModuleStart?: boolean;
  allowModuleEnd?: boolean;
  ignorePattern?: string;
  applyDefaultIgnorePatterns?: boolean;
  afterHashbangComment?: boolean;
}
type LinesAroundCommentRuleOptions = [LinesAroundCommentSchema0?];
//#endregion
//#region rules/lines-between-class-members/types.d.ts

type LinesBetweenClassMembersSchema0 = {
  /**
   * @minItems 1
   */
  enforce: [{
    blankLine: 'always' | 'never';
    prev: 'method' | 'field' | '*';
    next: 'method' | 'field' | '*';
  }, ...{
    blankLine: 'always' | 'never';
    prev: 'method' | 'field' | '*';
    next: 'method' | 'field' | '*';
  }[]];
} | ('always' | 'never');
interface LinesBetweenClassMembersSchema1 {
  exceptAfterSingleLine?: boolean;
  exceptAfterOverload?: boolean;
}
type LinesBetweenClassMembersRuleOptions = [LinesBetweenClassMembersSchema0?, LinesBetweenClassMembersSchema1?];
//#endregion
//#region rules/list-style/types.d.ts

type OverrideConfig = BaseConfig | 'off';
interface ListStyleSchema0 {
  singleLine?: SingleLineConfig;
  multiLine?: MultiLineConfig;
  overrides?: {
    '()'?: OverrideConfig;
    '[]'?: OverrideConfig;
    '{}'?: OverrideConfig;
    '<>'?: OverrideConfig;
    'ArrayExpression'?: OverrideConfig;
    'ArrayPattern'?: OverrideConfig;
    'ArrowFunctionExpression'?: OverrideConfig;
    'CallExpression'?: OverrideConfig;
    'ExportNamedDeclaration'?: OverrideConfig;
    'FunctionDeclaration'?: OverrideConfig;
    'FunctionExpression'?: OverrideConfig;
    'IfStatement'?: OverrideConfig;
    'ImportAttributes'?: OverrideConfig;
    'ImportDeclaration'?: OverrideConfig;
    'JSONArrayExpression'?: OverrideConfig;
    'JSONObjectExpression'?: OverrideConfig;
    'NewExpression'?: OverrideConfig;
    'ObjectExpression'?: OverrideConfig;
    'ObjectPattern'?: OverrideConfig;
    'TSDeclareFunction'?: OverrideConfig;
    'TSEnumBody'?: OverrideConfig;
    'TSFunctionType'?: OverrideConfig;
    'TSInterfaceBody'?: OverrideConfig;
    'TSTupleType'?: OverrideConfig;
    'TSTypeLiteral'?: OverrideConfig;
    'TSTypeParameterDeclaration'?: OverrideConfig;
    'TSTypeParameterInstantiation'?: OverrideConfig;
  };
}
interface SingleLineConfig {
  spacing?: 'always' | 'never';
  maxItems?: number;
}
interface MultiLineConfig {
  minItems?: number;
}
interface BaseConfig {
  singleLine?: SingleLineConfig;
  multiline?: MultiLineConfig;
}
type ListStyleRuleOptions = [ListStyleSchema0?];
//#endregion
//#region rules/max-len/types.d.ts

type MaxLenSchema0 = {
  code?: number;
  comments?: number;
  tabWidth?: number;
  ignorePattern?: string;
  ignoreComments?: boolean;
  ignoreStrings?: boolean;
  ignoreUrls?: boolean;
  ignoreTemplateLiterals?: boolean;
  ignoreRegExpLiterals?: boolean;
  ignoreTrailingComments?: boolean;
} | number;
type MaxLenSchema1 = {
  code?: number;
  comments?: number;
  tabWidth?: number;
  ignorePattern?: string;
  ignoreComments?: boolean;
  ignoreStrings?: boolean;
  ignoreUrls?: boolean;
  ignoreTemplateLiterals?: boolean;
  ignoreRegExpLiterals?: boolean;
  ignoreTrailingComments?: boolean;
} | number;
interface MaxLenSchema2 {
  code?: number;
  comments?: number;
  tabWidth?: number;
  ignorePattern?: string;
  ignoreComments?: boolean;
  ignoreStrings?: boolean;
  ignoreUrls?: boolean;
  ignoreTemplateLiterals?: boolean;
  ignoreRegExpLiterals?: boolean;
  ignoreTrailingComments?: boolean;
}
type MaxLenRuleOptions = [MaxLenSchema0?, MaxLenSchema1?, MaxLenSchema2?];
//#endregion
//#region rules/max-statements-per-line/types.d.ts

interface MaxStatementsPerLineSchema0 {
  max?: number;
  ignoredNodes?: ('BreakStatement' | 'ClassDeclaration' | 'ContinueStatement' | 'DebuggerStatement' | 'DoWhileStatement' | 'ExpressionStatement' | 'ForInStatement' | 'ForOfStatement' | 'ForStatement' | 'FunctionDeclaration' | 'IfStatement' | 'ImportDeclaration' | 'LabeledStatement' | 'ReturnStatement' | 'SwitchStatement' | 'ThrowStatement' | 'TryStatement' | 'VariableDeclaration' | 'WhileStatement' | 'WithStatement' | 'ExportNamedDeclaration' | 'ExportDefaultDeclaration' | 'ExportAllDeclaration')[];
}
type MaxStatementsPerLineRuleOptions = [MaxStatementsPerLineSchema0?];
//#endregion
//#region rules/member-delimiter-style/types.d.ts

type MultiLineOption = 'none' | 'semi' | 'comma';
type SingleLineOption = 'semi' | 'comma';
interface MemberDelimiterStyleSchema0 {
  multiline?: {
    delimiter?: MultiLineOption;
    requireLast?: boolean;
  };
  singleline?: {
    delimiter?: SingleLineOption;
    requireLast?: boolean;
  };
  overrides?: {
    interface?: DelimiterConfig;
    typeLiteral?: DelimiterConfig;
  };
  multilineDetection?: 'brackets' | 'last-member';
}
interface DelimiterConfig {
  multiline?: {
    delimiter?: MultiLineOption;
    requireLast?: boolean;
  };
  singleline?: {
    delimiter?: SingleLineOption;
    requireLast?: boolean;
  };
}
type MemberDelimiterStyleRuleOptions = [MemberDelimiterStyleSchema0?];
//#endregion
//#region rules/multiline-comment-style/types.d.ts

type MultilineCommentStyleSchema0 = [] | ['starred-block' | 'bare-block'] | [] | ['separate-lines'] | ['separate-lines', {
  checkJSDoc?: boolean;
  checkExclamation?: boolean;
}];
type MultilineCommentStyleRuleOptions = MultilineCommentStyleSchema0;
//#endregion
//#region rules/multiline-ternary/types.d.ts

type MultilineTernarySchema0 = 'always' | 'always-multiline' | 'never';
interface MultilineTernarySchema1 {
  ignoreJSX?: boolean;
}
type MultilineTernaryRuleOptions = [MultilineTernarySchema0?, MultilineTernarySchema1?];
//#endregion
//#region rules/new-parens/types.d.ts

type NewParensSchema0 = 'always' | 'never';
type NewParensRuleOptions = [NewParensSchema0?];
//#endregion
//#region rules/newline-per-chained-call/types.d.ts

interface NewlinePerChainedCallSchema0 {
  ignoreChainWithDepth?: number;
}
type NewlinePerChainedCallRuleOptions = [NewlinePerChainedCallSchema0?];
//#endregion
//#region rules/no-confusing-arrow/types.d.ts

interface NoConfusingArrowSchema0 {
  allowParens?: boolean;
  onlyOneSimpleParam?: boolean;
}
type NoConfusingArrowRuleOptions = [NoConfusingArrowSchema0?];
//#endregion
//#region rules/no-extra-parens/types.d.ts

type NoExtraParensSchema0 = [] | ['functions'] | [] | ['all'] | ['all', {
  conditionalAssign?: boolean;
  ternaryOperandBinaryExpressions?: boolean;
  nestedBinaryExpressions?: boolean;
  returnAssign?: boolean;
  ignoreJSX?: 'none' | 'all' | 'single-line' | 'multi-line';
  enforceForArrowConditionals?: boolean;
  enforceForSequenceExpressions?: boolean;
  enforceForNewInMemberExpressions?: boolean;
  enforceForFunctionPrototypeMethods?: boolean;
  allowParensAfterCommentPattern?: string;
  nestedConditionalExpressions?: boolean;
  allowNodesInSpreadElement?: {
    ConditionalExpression?: boolean;
    LogicalExpression?: boolean;
    AwaitExpression?: boolean;
  };
  ignoredNodes?: string[];
}];
type NoExtraParensRuleOptions = NoExtraParensSchema0;
//#endregion
//#region rules/no-extra-semi/types.d.ts

type NoExtraSemiRuleOptions = [];
//#endregion
//#region rules/no-floating-decimal/types.d.ts

type NoFloatingDecimalRuleOptions = [];
//#endregion
//#region rules/no-mixed-operators/types.d.ts

interface NoMixedOperatorsSchema0 {
  groups?: [('+' | '-' | '*' | '/' | '%' | '**' | '&' | '|' | '^' | '~' | '<<' | '>>' | '>>>' | '==' | '!=' | '===' | '!==' | '>' | '>=' | '<' | '<=' | '&&' | '||' | 'in' | 'instanceof' | '?:' | '??'), ('+' | '-' | '*' | '/' | '%' | '**' | '&' | '|' | '^' | '~' | '<<' | '>>' | '>>>' | '==' | '!=' | '===' | '!==' | '>' | '>=' | '<' | '<=' | '&&' | '||' | 'in' | 'instanceof' | '?:' | '??'), ...('+' | '-' | '*' | '/' | '%' | '**' | '&' | '|' | '^' | '~' | '<<' | '>>' | '>>>' | '==' | '!=' | '===' | '!==' | '>' | '>=' | '<' | '<=' | '&&' | '||' | 'in' | 'instanceof' | '?:' | '??')[]][];
  allowSamePrecedence?: boolean;
}
type NoMixedOperatorsRuleOptions = [NoMixedOperatorsSchema0?];
//#endregion
//#region rules/no-mixed-spaces-and-tabs/types.d.ts

type NoMixedSpacesAndTabsSchema0 = 'smart-tabs' | boolean;
type NoMixedSpacesAndTabsRuleOptions = [NoMixedSpacesAndTabsSchema0?];
//#endregion
//#region rules/no-multi-spaces/types.d.ts

interface NoMultiSpacesSchema0 {
  exceptions?: {
    [k: string]: boolean;
  };
  ignoreEOLComments?: boolean;
  includeTabs?: boolean;
}
type NoMultiSpacesRuleOptions = [NoMultiSpacesSchema0?];
//#endregion
//#region rules/no-multiple-empty-lines/types.d.ts

interface NoMultipleEmptyLinesSchema0 {
  max: number;
  maxEOF?: number;
  maxBOF?: number;
}
type NoMultipleEmptyLinesRuleOptions = [NoMultipleEmptyLinesSchema0?];
//#endregion
//#region rules/no-tabs/types.d.ts

interface NoTabsSchema0 {
  allowIndentationTabs?: boolean;
}
type NoTabsRuleOptions = [NoTabsSchema0?];
//#endregion
//#region rules/no-trailing-spaces/types.d.ts

interface NoTrailingSpacesSchema0 {
  skipBlankLines?: boolean;
  ignoreComments?: boolean;
}
type NoTrailingSpacesRuleOptions = [NoTrailingSpacesSchema0?];
//#endregion
//#region rules/no-whitespace-before-property/types.d.ts

type NoWhitespaceBeforePropertyRuleOptions = [];
//#endregion
//#region rules/nonblock-statement-body-position/types.d.ts

type NonblockStatementBodyPositionSchema0 = 'beside' | 'below' | 'any';
interface NonblockStatementBodyPositionSchema1 {
  overrides?: {
    if?: 'beside' | 'below' | 'any';
    else?: 'beside' | 'below' | 'any';
    while?: 'beside' | 'below' | 'any';
    do?: 'beside' | 'below' | 'any';
    for?: 'beside' | 'below' | 'any';
  };
}
type NonblockStatementBodyPositionRuleOptions = [NonblockStatementBodyPositionSchema0?, NonblockStatementBodyPositionSchema1?];
//#endregion
//#region rules/object-curly-newline/types.d.ts

type ObjectCurlyNewlineSchema0 = (('always' | 'never') | {
  multiline?: boolean;
  minProperties?: number;
  consistent?: boolean;
}) | {
  ObjectExpression?: ('always' | 'never') | {
    multiline?: boolean;
    minProperties?: number;
    consistent?: boolean;
  };
  ObjectPattern?: ('always' | 'never') | {
    multiline?: boolean;
    minProperties?: number;
    consistent?: boolean;
  };
  ImportDeclaration?: ('always' | 'never') | {
    multiline?: boolean;
    minProperties?: number;
    consistent?: boolean;
  };
  ExportDeclaration?: ('always' | 'never') | {
    multiline?: boolean;
    minProperties?: number;
    consistent?: boolean;
  };
  TSTypeLiteral?: ('always' | 'never') | {
    multiline?: boolean;
    minProperties?: number;
    consistent?: boolean;
  };
  TSInterfaceBody?: ('always' | 'never') | {
    multiline?: boolean;
    minProperties?: number;
    consistent?: boolean;
  };
  TSEnumBody?: ('always' | 'never') | {
    multiline?: boolean;
    minProperties?: number;
    consistent?: boolean;
  };
};
type ObjectCurlyNewlineRuleOptions = [ObjectCurlyNewlineSchema0?];
//#endregion
//#region rules/object-curly-spacing/types.d.ts

type ObjectCurlySpacingSchema0 = 'always' | 'never';
interface ObjectCurlySpacingSchema1 {
  arraysInObjects?: boolean;
  objectsInObjects?: boolean;
  overrides?: {
    ObjectPattern?: 'always' | 'never';
    ObjectExpression?: 'always' | 'never';
    ImportDeclaration?: 'always' | 'never';
    ImportAttributes?: 'always' | 'never';
    ExportNamedDeclaration?: 'always' | 'never';
    ExportAllDeclaration?: 'always' | 'never';
    TSMappedType?: 'always' | 'never';
    TSTypeLiteral?: 'always' | 'never';
    TSInterfaceBody?: 'always' | 'never';
    TSEnumBody?: 'always' | 'never';
  };
  emptyObjects?: 'ignore' | 'always' | 'never';
}
type ObjectCurlySpacingRuleOptions = [ObjectCurlySpacingSchema0?, ObjectCurlySpacingSchema1?];
//#endregion
//#region rules/object-property-newline/types.d.ts

interface ObjectPropertyNewlineSchema0 {
  allowAllPropertiesOnSameLine?: boolean;
}
type ObjectPropertyNewlineRuleOptions = [ObjectPropertyNewlineSchema0?];
//#endregion
//#region rules/one-var-declaration-per-line/types.d.ts

type OneVarDeclarationPerLineSchema0 = 'always' | 'initializations';
type OneVarDeclarationPerLineRuleOptions = [OneVarDeclarationPerLineSchema0?];
//#endregion
//#region rules/operator-linebreak/types.d.ts

type OperatorLinebreakSchema0 = ('after' | 'before' | 'none') | null;
interface OperatorLinebreakSchema1 {
  overrides?: {
    [k: string]: 'after' | 'before' | 'none' | 'ignore';
  };
}
type OperatorLinebreakRuleOptions = [OperatorLinebreakSchema0?, OperatorLinebreakSchema1?];
//#endregion
//#region rules/padded-blocks/types.d.ts

type PaddedBlocksSchema0 = ('always' | 'never' | 'start' | 'end') | {
  blocks?: 'always' | 'never' | 'start' | 'end';
  switches?: 'always' | 'never' | 'start' | 'end';
  classes?: 'always' | 'never' | 'start' | 'end';
};
interface PaddedBlocksSchema1 {
  allowSingleLineBlocks?: boolean;
}
type PaddedBlocksRuleOptions = [PaddedBlocksSchema0?, PaddedBlocksSchema1?];
//#endregion
//#region rules/padding-line-between-statements/types.d.ts

type PaddingType = 'any' | 'never' | 'always';
type StatementOption = StatementMatcher | [StatementMatcher, ...StatementMatcher[]];
type StatementMatcher = StatementType | SelectorOption;
type StatementType = '*' | 'exports' | 'require' | 'directive' | 'iife' | 'block' | 'empty' | 'function' | 'ts-method' | 'break' | 'case' | 'class' | 'continue' | 'debugger' | 'default' | 'do' | 'for' | 'if' | 'import' | 'switch' | 'throw' | 'try' | 'while' | 'with' | 'cjs-export' | 'cjs-import' | 'enum' | 'interface' | 'function-overload' | 'block-like' | 'singleline-block-like' | 'multiline-block-like' | 'expression' | 'singleline-expression' | 'multiline-expression' | 'return' | 'singleline-return' | 'multiline-return' | 'export' | 'singleline-export' | 'multiline-export' | 'var' | 'singleline-var' | 'multiline-var' | 'let' | 'singleline-let' | 'multiline-let' | 'const' | 'singleline-const' | 'multiline-const' | 'using' | 'singleline-using' | 'multiline-using' | 'type' | 'singleline-type' | 'multiline-type';
type PaddingLineBetweenStatementsSchema0 = {
  blankLine: PaddingType;
  prev: StatementOption;
  next: StatementOption;
}[];
interface SelectorOption {
  selector: string;
  lineMode?: 'any' | 'singleline' | 'multiline';
}
type PaddingLineBetweenStatementsRuleOptions = PaddingLineBetweenStatementsSchema0;
//#endregion
//#region rules/quote-props/types.d.ts

type QuotePropsSchema0 = [] | ['always' | 'as-needed' | 'consistent' | 'consistent-as-needed'] | [] | ['always' | 'as-needed' | 'consistent' | 'consistent-as-needed'] | [('always' | 'as-needed' | 'consistent' | 'consistent-as-needed'), {
  keywords?: boolean;
  unnecessary?: boolean;
  numbers?: boolean;
}];
type QuotePropsRuleOptions = QuotePropsSchema0;
//#endregion
//#region rules/quotes/types.d.ts

type QuotesSchema0 = 'single' | 'double' | 'backtick';
type QuotesSchema1 = 'avoid-escape' | {
  avoidEscape?: boolean;
  allowTemplateLiterals?: boolean | ('never' | 'avoidEscape' | 'always');
  ignoreStringLiterals?: boolean;
};
type QuotesRuleOptions = [QuotesSchema0?, QuotesSchema1?];
//#endregion
//#region rules/rest-spread-spacing/types.d.ts

type RestSpreadSpacingSchema0 = 'always' | 'never';
type RestSpreadSpacingRuleOptions = [RestSpreadSpacingSchema0?];
//#endregion
//#region rules/semi-spacing/types.d.ts

interface SemiSpacingSchema0 {
  before?: boolean;
  after?: boolean;
}
type SemiSpacingRuleOptions = [SemiSpacingSchema0?];
//#endregion
//#region rules/semi-style/types.d.ts

type SemiStyleSchema0 = 'last' | 'first';
type SemiStyleRuleOptions = [SemiStyleSchema0?];
//#endregion
//#region rules/semi/types.d.ts

type SemiSchema0 = [] | ['never'] | ['never', {
  beforeStatementContinuationChars?: 'always' | 'any' | 'never';
}] | [] | ['always'] | ['always', {
  omitLastInOneLineBlock?: boolean;
  omitLastInOneLineClassBody?: boolean;
}];
type SemiRuleOptions = SemiSchema0;
//#endregion
//#region rules/space-before-blocks/types.d.ts

type SpaceBeforeBlocksSchema0 = ('always' | 'never') | {
  keywords?: 'always' | 'never' | 'off';
  functions?: 'always' | 'never' | 'off';
  classes?: 'always' | 'never' | 'off';
  modules?: 'always' | 'never' | 'off';
};
type SpaceBeforeBlocksRuleOptions = [SpaceBeforeBlocksSchema0?];
//#endregion
//#region rules/space-before-function-paren/types.d.ts

type SpaceBeforeFunctionParenSchema0 = ('always' | 'never') | {
  anonymous?: 'always' | 'never' | 'ignore';
  named?: 'always' | 'never' | 'ignore';
  asyncArrow?: 'always' | 'never' | 'ignore';
  catch?: 'always' | 'never' | 'ignore';
};
type SpaceBeforeFunctionParenRuleOptions = [SpaceBeforeFunctionParenSchema0?];
//#endregion
//#region rules/space-in-parens/types.d.ts

type SpaceInParensSchema0 = 'always' | 'never';
interface SpaceInParensSchema1 {
  exceptions?: ('{}' | '[]' | '()' | 'empty')[];
}
type SpaceInParensRuleOptions = [SpaceInParensSchema0?, SpaceInParensSchema1?];
//#endregion
//#region rules/space-infix-ops/types.d.ts

interface SpaceInfixOpsSchema0 {
  int32Hint?: boolean;
  ignoreTypes?: boolean;
}
type SpaceInfixOpsRuleOptions = [SpaceInfixOpsSchema0?];
//#endregion
//#region rules/space-unary-ops/types.d.ts

interface SpaceUnaryOpsSchema0 {
  words?: boolean;
  nonwords?: boolean;
  overrides?: {
    [k: string]: boolean;
  };
}
type SpaceUnaryOpsRuleOptions = [SpaceUnaryOpsSchema0?];
//#endregion
//#region rules/spaced-comment/types.d.ts

type SpacedCommentSchema0 = 'always' | 'never';
interface SpacedCommentSchema1 {
  exceptions?: string[];
  markers?: string[];
  line?: {
    exceptions?: string[];
    markers?: string[];
  };
  block?: {
    exceptions?: string[];
    markers?: string[];
    balanced?: boolean;
  };
}
type SpacedCommentRuleOptions = [SpacedCommentSchema0?, SpacedCommentSchema1?];
//#endregion
//#region rules/switch-colon-spacing/types.d.ts

interface SwitchColonSpacingSchema0 {
  before?: boolean;
  after?: boolean;
}
type SwitchColonSpacingRuleOptions = [SwitchColonSpacingSchema0?];
//#endregion
//#region rules/template-curly-spacing/types.d.ts

type TemplateCurlySpacingSchema0 = 'always' | 'never';
type TemplateCurlySpacingRuleOptions = [TemplateCurlySpacingSchema0?];
//#endregion
//#region rules/template-tag-spacing/types.d.ts

type TemplateTagSpacingSchema0 = 'always' | 'never';
type TemplateTagSpacingRuleOptions = [TemplateTagSpacingSchema0?];
//#endregion
//#region rules/type-annotation-spacing/types.d.ts

interface TypeAnnotationSpacingSchema0 {
  before?: boolean;
  after?: boolean;
  overrides?: {
    colon?: SpacingConfig;
    arrow?: 'ignore' | SpacingConfig;
    variable?: SpacingConfig;
    parameter?: SpacingConfig;
    property?: SpacingConfig;
    returnType?: SpacingConfig;
  };
}
interface SpacingConfig {
  before?: boolean;
  after?: boolean;
}
type TypeAnnotationSpacingRuleOptions = [TypeAnnotationSpacingSchema0?];
//#endregion
//#region rules/type-generic-spacing/types.d.ts

type TypeGenericSpacingRuleOptions = [];
//#endregion
//#region rules/type-named-tuple-spacing/types.d.ts

type TypeNamedTupleSpacingRuleOptions = [];
//#endregion
//#region rules/wrap-iife/types.d.ts

type WrapIifeSchema0 = 'outside' | 'inside' | 'any';
interface WrapIifeSchema1 {
  functionPrototypeMethods?: boolean;
}
type WrapIifeRuleOptions = [WrapIifeSchema0?, WrapIifeSchema1?];
//#endregion
//#region rules/wrap-regex/types.d.ts

type WrapRegexRuleOptions = [];
//#endregion
//#region rules/yield-star-spacing/types.d.ts

type YieldStarSpacingSchema0 = ('before' | 'after' | 'both' | 'neither') | {
  before?: boolean;
  after?: boolean;
};
type YieldStarSpacingRuleOptions = [YieldStarSpacingSchema0?];
//#endregion
export { KeywordSpacingRuleOptions as $, NoWhitespaceBeforePropertyRuleOptions as A, EolLastRuleOptions as At, NoConfusingArrowRuleOptions as B, ArrowParensRuleOptions as Bt, PaddedBlocksRuleOptions as C, IndentRuleOptions as Ct, ObjectCurlySpacingRuleOptions as D, FunctionParenNewlineRuleOptions as Dt, ObjectPropertyNewlineRuleOptions as E, GeneratorStarSpacingRuleOptions as Et, NoMixedSpacesAndTabsRuleOptions as F, CommaSpacingRuleOptions as Ft, MemberDelimiterStyleRuleOptions as G, NewParensRuleOptions as H, ArrayBracketSpacingRuleOptions as Ht, NoMixedOperatorsRuleOptions as I, CommaDangleRuleOptions as It, ListStyleRuleOptions as J, MaxStatementsPerLineRuleOptions as K, NoFloatingDecimalRuleOptions as L, BraceStyleRuleOptions as Lt, NoTabsRuleOptions as M, CurlyNewlineRuleOptions as Mt, NoMultipleEmptyLinesRuleOptions as N, ComputedPropertySpacingRuleOptions as Nt, ObjectCurlyNewlineRuleOptions as O, FunctionCallSpacingRuleOptions as Ot, NoMultiSpacesRuleOptions as P, CommaStyleRuleOptions as Pt, LineCommentPositionRuleOptions as Q, NoExtraSemiRuleOptions as R, BlockSpacingRuleOptions as Rt, PaddingLineBetweenStatementsRuleOptions as S, JsxChildElementSpacingRuleOptions as St, OneVarDeclarationPerLineRuleOptions as T, ImplicitArrowLinebreakRuleOptions as Tt, MultilineTernaryRuleOptions as U, ArrayBracketNewlineRuleOptions as Ut, NewlinePerChainedCallRuleOptions as V, ArrayElementNewlineRuleOptions as Vt, MultilineCommentStyleRuleOptions as W, LinesAroundCommentRuleOptions as X, LinesBetweenClassMembersRuleOptions as Y, LinebreakStyleRuleOptions as Z, SemiStyleRuleOptions as _, JsxCurlySpacingRuleOptions as _t, TypeGenericSpacingRuleOptions as a, JsxQuotesRuleOptions as at, QuotesRuleOptions as b, JsxClosingTagLocationRuleOptions as bt, TemplateCurlySpacingRuleOptions as c, JsxPascalCaseRuleOptions as ct, SpaceUnaryOpsRuleOptions as d, JsxMaxPropsPerLineRuleOptions as dt, KeySpacingRuleOptions as et, SpaceInfixOpsRuleOptions as f, JsxIndentRuleOptions as ft, SemiRuleOptions as g, JsxEqualsSpacingRuleOptions as gt, SpaceBeforeBlocksRuleOptions as h, JsxFirstPropNewLineRuleOptions as ht, TypeNamedTupleSpacingRuleOptions as i, JsxSelfClosingCompRuleOptions as it, NoTrailingSpacesRuleOptions as j, DotLocationRuleOptions as jt, NonblockStatementBodyPositionRuleOptions as k, FunctionCallArgumentNewlineRuleOptions as kt, SwitchColonSpacingRuleOptions as l, JsxOneExpressionPerLineRuleOptions as lt, SpaceBeforeFunctionParenRuleOptions as m, JsxFunctionCallNewlineRuleOptions as mt, WrapRegexRuleOptions as n, JsxTagSpacingRuleOptions as nt, TypeAnnotationSpacingRuleOptions as o, JsxPropsStyleRuleOptions as ot, SpaceInParensRuleOptions as p, JsxIndentPropsRuleOptions as pt, MaxLenRuleOptions as q, WrapIifeRuleOptions as r, JsxSortPropsRuleOptions as rt, TemplateTagSpacingRuleOptions as s, JsxPropsNoMultiSpacesRuleOptions as st, YieldStarSpacingRuleOptions as t, JsxWrapMultilinesRuleOptions as tt, SpacedCommentRuleOptions as u, JsxNewlineRuleOptions as ut, SemiSpacingRuleOptions as v, JsxCurlyNewlineRuleOptions as vt, OperatorLinebreakRuleOptions as w, IndentBinaryOpsRuleOptions as wt, QuotePropsRuleOptions as x, JsxClosingBracketLocationRuleOptions as xt, RestSpreadSpacingRuleOptions as y, JsxCurlyBracePresenceRuleOptions as yt, NoExtraParensRuleOptions as z, ArrowSpacingRuleOptions as zt };