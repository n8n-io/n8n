/**
 * @file Bash grammar for tree-sitter
 * @author Max Brunsfeld <maxbrunsfeld@gmail.com>
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const SPECIAL_CHARACTERS = [
  '\'', '"',
  '<', '>',
  '{', '}',
  '\\[', '\\]',
  '(', ')',
  '`', '$',
  '|', '&', ';',
  '\\',
  '\\s',
];

const PREC = {
  UPDATE: 0,
  ASSIGN: 1,
  TERNARY: 2,
  LOGICAL_OR: 3,
  LOGICAL_AND: 4,
  BITWISE_OR: 5,
  BITWISE_XOR: 6,
  BITWISE_AND: 7,
  EQUALITY: 8,
  COMPARE: 9,
  TEST: 10,
  UNARY: 11,
  SHIFT: 12,
  ADD: 13,
  MULTIPLY: 14,
  EXPONENT: 15,
  NEGATE: 16,
  PREFIX: 17,
  POSTFIX: 18,
};

module.exports = grammar({
  name: 'bash',

  conflicts: $ => [
    [$._expression, $.command_name],
    [$.command, $.variable_assignments],
    [$.redirected_statement, $.command],
    [$.redirected_statement, $.command_substitution],
    [$.function_definition, $.command_name],
    [$.pipeline],
  ],

  inline: $ => [
    $._statement,
    $._terminator,
    $._literal,
    $._terminated_statement,
    $._primary_expression,
    $._simple_variable_name,
    $._multiline_variable_name,
    $._special_variable_name,
    $._c_word,
    $._statement_not_subshell,
    $._redirect,
  ],

  externals: $ => [
    $.heredoc_start,
    $.simple_heredoc_body,
    $._heredoc_body_beginning,
    $.heredoc_content,
    $.heredoc_end,
    $.file_descriptor,
    $._empty_value,
    $._concat,
    $.variable_name, // Variable name followed by an operator like '=' or '+='
    $.test_operator,
    $.regex,
    $._regex_no_slash,
    $._regex_no_space,
    $._expansion_word,
    $.extglob_pattern,
    $._bare_dollar,
    $._brace_start,
    $._immediate_double_hash,
    $._external_expansion_sym_hash,
    $._external_expansion_sym_bang,
    $._external_expansion_sym_equal,
    '}',
    ']',
    '<<',
    '<<-',
    /\n/,
    '(',
    'esac',
    $.__error_recovery,
  ],

  extras: $ => [
    $.comment,
    /\s/,
    /\\\r?\n/,
    /\\( |\t|\v|\f)/,
  ],

  supertypes: $ => [
    $._statement,
    $._expression,
    $._primary_expression,
  ],

  word: $ => $.word,

  rules: {
    program: $ => optional($._statements),

    _statements: $ => prec(1, seq(
      repeat(seq(
        $._statement,
        $._terminator,
      )),
      $._statement,
      optional($._terminator),
    )),

    _terminated_statement: $ => repeat1(seq(
      $._statement,
      $._terminator,
    )),

    // Statements

    _statement: $ => choice(
      $._statement_not_subshell,
      $.subshell,
    ),

    _statement_not_subshell: $ => choice(
      $.redirected_statement,
      $.variable_assignment,
      $.variable_assignments,
      $.command,
      $.declaration_command,
      $.unset_command,
      $.test_command,
      $.negated_command,
      $.for_statement,
      $.c_style_for_statement,
      $.while_statement,
      $.if_statement,
      $.case_statement,
      $.pipeline,
      $.list,
      $.compound_statement,
      $.function_definition,
    ),

    _statement_not_pipeline: $ => prec(1, choice(
      $.redirected_statement,
      $.variable_assignment,
      $.variable_assignments,
      $.command,
      $.declaration_command,
      $.unset_command,
      $.test_command,
      $.negated_command,
      $.for_statement,
      $.c_style_for_statement,
      $.while_statement,
      $.if_statement,
      $.case_statement,
      $.list,
      $.compound_statement,
      $.function_definition,
      $.subshell,
    )),

    redirected_statement: $ => prec.dynamic(-1, prec.right(-1, choice(
      seq(
        field('body', $._statement),
        field('redirect', choice(
          repeat1(choice(
            $.file_redirect,
            $.heredoc_redirect,
          )),
        )),
      ),
      seq(
        field('body', choice($.if_statement, $.while_statement)),
        $.herestring_redirect,
      ),
      field('redirect', repeat1($._redirect)),
      $.herestring_redirect,
    ))),

    for_statement: $ => seq(
      choice('for', 'select'),
      field('variable', $._simple_variable_name),
      optional(seq(
        'in',
        field('value', repeat1($._literal)),
      )),
      $._terminator,
      field('body', $.do_group),
    ),

    c_style_for_statement: $ => seq(
      'for',
      '((',
      choice($._for_body),
      '))',
      optional(';'),
      field('body', choice(
        $.do_group,
        $.compound_statement,
      )),
    ),
    _for_body: $ => seq(
      field('initializer', commaSep($._c_expression)),
      $._c_terminator,
      field('condition', commaSep($._c_expression)),
      $._c_terminator,
      field('update', commaSep($._c_expression)),
    ),

    _c_expression: $ => choice(
      $._c_expression_not_assignment,
      alias($._c_variable_assignment, $.variable_assignment),
    ),
    _c_expression_not_assignment: $ => choice(
      $._c_word,
      $.simple_expansion,
      $.expansion,
      $.number,
      $.string,
      alias($._c_unary_expression, $.unary_expression),
      alias($._c_binary_expression, $.binary_expression),
      alias($._c_postfix_expression, $.postfix_expression),
      alias($._c_parenthesized_expression, $.parenthesized_expression),
      $.command_substitution,
    ),

    _c_variable_assignment: $ => seq(
      field('name', alias($._c_word, $.variable_name)),
      '=',
      field('value', $._c_expression),
    ),
    _c_unary_expression: $ => prec(PREC.PREFIX, seq(
      field('operator', choice('++', '--')),
      $._c_expression_not_assignment,
    )),
    _c_binary_expression: $ => {
      const table = [
        [choice('+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '&=', '^=', '|='), PREC.UPDATE],
        [choice('||', '-o'), PREC.LOGICAL_OR],
        [choice('&&', '-a'), PREC.LOGICAL_AND],
        ['|', PREC.BITWISE_OR],
        ['^', PREC.BITWISE_XOR],
        ['&', PREC.BITWISE_AND],
        [choice('==', '!='), PREC.EQUALITY],
        [choice('<', '>', '<=', '>='), PREC.COMPARE],
        [choice('<<', '>>'), PREC.SHIFT],
        [choice('+', '-'), PREC.ADD],
        [choice('*', '/', '%'), PREC.MULTIPLY],
        ['**', PREC.EXPONENT],
      ];

      return choice(...table.map(([operator, precedence]) => {
        // @ts-ignore
        return prec[operator === '**' ? 'right' : 'left'](precedence, seq(
          field('left', $._c_expression_not_assignment),
          // @ts-ignore
          field('operator', operator),
          field('right', $._c_expression_not_assignment),
        ));
      }));
    },
    _c_postfix_expression: $ => prec(PREC.POSTFIX, seq(
      $._c_expression_not_assignment,
      field('operator', choice('++', '--')),
    )),
    _c_parenthesized_expression: $ => seq(
      '(',
      commaSep1($._c_expression),
      ')',
    ),
    _c_word: $ => alias(/[a-zA-Z_][a-zA-Z0-9_]*/, $.word),

    while_statement: $ => seq(
      choice('while', 'until'),
      field('condition', $._terminated_statement),
      field('body', $.do_group),
    ),

    do_group: $ => seq(
      'do',
      optional($._terminated_statement),
      'done',
    ),

    if_statement: $ => seq(
      'if',
      field('condition', $._terminated_statement),
      'then',
      optional($._terminated_statement),
      repeat($.elif_clause),
      optional($.else_clause),
      'fi',
    ),

    elif_clause: $ => seq(
      'elif',
      $._terminated_statement,
      'then',
      optional($._terminated_statement),
    ),

    else_clause: $ => seq(
      'else',
      optional($._terminated_statement),
    ),

    case_statement: $ => seq(
      'case',
      field('value', $._literal),
      optional($._terminator),
      'in',
      optional($._terminator),
      optional(seq(
        repeat($.case_item),
        alias($.last_case_item, $.case_item),
      )),
      'esac',
    ),

    case_item: $ => seq(
      choice(
        seq(
          optional('('),
          field('value', choice($._literal, $._extglob_blob)),
          repeat(seq('|', field('value', choice($._literal, $._extglob_blob)))),
          ')',
        ),
      ),
      optional($._statements),
      prec(1, choice(
        field('termination', ';;'),
        field('fallthrough', choice(';&', ';;&')),
      )),
    ),

    last_case_item: $ => seq(
      optional('('),
      field('value', choice($._literal, $._extglob_blob)),
      repeat(seq('|', field('value', choice($._literal, $._extglob_blob)))),
      ')',
      optional($._statements),
      optional(prec(1, ';;')),
    ),

    function_definition: $ => prec.right(seq(
      choice(
        seq(
          'function',
          field('name', $.word),
          optional(seq('(', ')')),
        ),
        seq(
          field('name', $.word),
          '(', ')',
        ),
      ),
      field(
        'body',
        choice(
          $.compound_statement,
          $.subshell,
          $.test_command,
          $.if_statement,
        ),
      ),
      field('redirect', optional($._redirect)),
    )),

    compound_statement: $ => seq(
      '{',
      optional($._terminated_statement),
      token(prec(-1, '}')),
    ),

    subshell: $ => seq(
      '(',
      $._statements,
      ')',
    ),

    pipeline: $ => prec.right(seq(
      $._statement_not_pipeline,
      repeat1(seq(
        choice('|', '|&'),
        $._statement_not_pipeline,
      )),
    )),

    list: $ => prec.left(-1, seq(
      $._statement,
      choice('&&', '||'),
      $._statement,
    )),

    // Commands

    negated_command: $ => seq(
      '!',
      choice(
        prec(2, $.command),
        prec(1, $.variable_assignment),
        $.test_command,
        $.subshell,
      ),
    ),

    test_command: $ => seq(
      choice(
        seq('[', optional(choice($._expression, $.redirected_statement)), ']'),
        seq(
          '[[',
          choice(
            $._expression,
            alias($._test_command_binary_expression, $.binary_expression),
          ),
          ']]',
        ),
        seq('((', optional($._expression), '))'),
      ),
    ),

    _test_command_binary_expression: $ => prec(PREC.ASSIGN,
      seq(
        field('left', $._expression),
        field('operator', '='),
        field('right', alias($._regex_no_space, $.regex)),
      ),
    ),

    declaration_command: $ => prec.left(seq(
      choice('declare', 'typeset', 'export', 'readonly', 'local'),
      repeat(choice(
        $._literal,
        $._simple_variable_name,
        $.variable_assignment,
      )),
    )),

    unset_command: $ => prec.left(seq(
      choice('unset', 'unsetenv'),
      repeat(choice(
        $._literal,
        $._simple_variable_name,
      )),
    )),

    command: $ => prec.left(seq(
      repeat(choice(
        $.variable_assignment,
        field('redirect', $._redirect),
      )),
      field('name', $.command_name),
      choice(
        repeat(choice(
          field('argument', $._literal),
          field('argument', alias($._bare_dollar, '$')),
          field('argument', seq(
            choice('=~', '=='),
            choice($._literal, $.regex),
          )),
          field('redirect', $.herestring_redirect),
        )),
        $.subshell,
      ),
    )),

    command_name: $ => $._literal,

    variable_assignment: $ => seq(
      field('name', choice(
        $.variable_name,
        $.subscript,
      )),
      choice(
        '=',
        '+=',
      ),
      field('value', choice(
        $._literal,
        $.array,
        $._empty_value,
        alias($._comment_word, $.word),
      )),
    ),

    variable_assignments: $ => seq($.variable_assignment, repeat1($.variable_assignment)),

    subscript: $ => seq(
      field('name', $.variable_name),
      '[',
      field('index', choice($._literal, $.binary_expression, $.unary_expression, $.parenthesized_expression)),
      optional($._concat),
      ']',
      optional($._concat),
    ),

    file_redirect: $ => prec.left(seq(
      field('descriptor', optional($.file_descriptor)),
      choice(
        seq(
          choice('<', '>', '>>', '&>', '&>>', '<&', '>&', '>|'),
          field('destination', repeat1($._literal)),
        ),
        seq(
          choice('<&-', '>&-'), // close file descriptor
          optional(field('destination', $._literal)),
        ),
      ),
    )),

    heredoc_redirect: $ => seq(
      field('descriptor', optional($.file_descriptor)),
      choice('<<', '<<-'),
      $.heredoc_start,
      optional(choice(
        alias($._heredoc_pipeline, $.pipeline),
        seq(
          field('redirect', repeat1($._redirect)),
          optional($._heredoc_expression),
        ),
        $._heredoc_expression,
        $._heredoc_command,
      )),
      /\n/,
      choice($._heredoc_body, $._simple_heredoc_body),
    ),

    _heredoc_pipeline: $ => seq(
      choice('|', '|&'),
      $._statement,
    ),

    _heredoc_expression: $ => seq(
      field('operator', choice('||', '&&')),
      field('right', $._statement),
    ),

    _heredoc_command: $ => repeat1(field('argument', $._literal)),

    _heredoc_body: $ => seq(
      $.heredoc_body,
      $.heredoc_end,
    ),

    heredoc_body: $ => seq(
      $._heredoc_body_beginning,
      repeat(choice(
        $.expansion,
        $.simple_expansion,
        $.command_substitution,
        $.heredoc_content,
      )),
    ),

    _simple_heredoc_body: $ => seq(
      alias($.simple_heredoc_body, $.heredoc_body),
      $.heredoc_end,
    ),

    herestring_redirect: $ => prec.left(seq(
      field('descriptor', optional($.file_descriptor)),
      '<<<',
      $._literal,
    )),

    _redirect: $ => choice($.file_redirect, $.herestring_redirect),

    // Expressions

    _expression: $ => choice(
      $._literal,
      $.unary_expression,
      $.ternary_expression,
      $.binary_expression,
      $.postfix_expression,
      $.parenthesized_expression,
    ),

    // https://tldp.org/LDP/abs/html/opprecedence.html
    binary_expression: $ => {
      const table = [
        [choice('+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '&=', '^=', '|='), PREC.UPDATE],
        [choice('=', '=~'), PREC.ASSIGN],
        ['||', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['|', PREC.BITWISE_OR],
        ['^', PREC.BITWISE_XOR],
        ['&', PREC.BITWISE_AND],
        [choice('==', '!='), PREC.EQUALITY],
        [choice('<', '>', '<=', '>='), PREC.COMPARE],
        [$.test_operator, PREC.TEST],
        [choice('<<', '>>'), PREC.SHIFT],
        [choice('+', '-'), PREC.ADD],
        [choice('*', '/', '%'), PREC.MULTIPLY],
        ['**', PREC.EXPONENT],
      ];

      return choice(
        choice(...table.map(([operator, precedence]) => {
          // @ts-ignore
          return prec[operator === '**' ? 'right' : 'left'](precedence, seq(
            field('left', $._expression),
            // @ts-ignore
            field('operator', operator),
            field('right', $._expression),
          ));
        })),
        prec(PREC.ASSIGN, seq(
          field('left', $._expression),
          field('operator', '=~'),
          field('right', alias($._regex_no_space, $.regex)),
        )),
        prec(PREC.EQUALITY, seq(
          field('left', $._expression),
          field('operator', choice('==', '!=')),
          field('right', $._extglob_blob),
        )),
      );
    },

    ternary_expression: $ => prec.left(PREC.TERNARY, seq(
      field('condition', $._expression),
      '?',
      field('consequence', $._expression),
      ':',
      field('alternative', $._expression),
    )),

    unary_expression: $ => choice(
      prec(PREC.PREFIX, seq(
        field('operator', tokenLiterals(1, '++', '--')),
        $._expression,
      )),
      prec(PREC.UNARY, seq(
        field('operator', tokenLiterals(1, '-', '+', '~')),
        $._expression,
      )),
      prec.right(PREC.UNARY, seq(
        field('operator', '!'),
        $._expression,
      )),
      prec.right(PREC.TEST, seq(
        field('operator', $.test_operator),
        $._expression,
      )),
    ),

    postfix_expression: $ => prec(PREC.POSTFIX, seq(
      $._expression,
      field('operator', choice('++', '--')),
    )),

    parenthesized_expression: $ => seq(
      '(',
      $._expression,
      ')',
    ),

    // Literals

    _literal: $ => choice(
      $.concatenation,
      $._primary_expression,
      alias(prec(-2, repeat1($._special_character)), $.word),
    ),

    _primary_expression: $ => choice(
      $.word,
      alias($.test_operator, $.word),
      $.string,
      $.raw_string,
      $.translated_string,
      $.ansi_c_string,
      $.number,
      $.expansion,
      $.simple_expansion,
      $.command_substitution,
      $.process_substitution,
      $.arithmetic_expansion,
      $.brace_expression,
    ),

    arithmetic_expansion: $ => choice(
      seq(choice('$((', '(('), commaSep1($._arithmetic_expression), '))'),
      seq('$[', $._arithmetic_expression, ']'),
    ),

    brace_expression: $ => seq(
      alias($._brace_start, '{'),
      alias(token.immediate(/\d+/), $.number),
      token.immediate('..'),
      alias(token.immediate(/\d+/), $.number),
      token.immediate('}'),
    ),

    _arithmetic_expression: $ => prec(1, choice(
      $._arithmetic_literal,
      alias($._arithmetic_unary_expression, $.unary_expression),
      alias($._arithmetic_ternary_expression, $.ternary_expression),
      alias($._arithmetic_binary_expression, $.binary_expression),
      alias($._arithmetic_postfix_expression, $.postfix_expression),
      alias($._arithmetic_parenthesized_expression, $.parenthesized_expression),
      $.command_substitution,
    )),

    _arithmetic_literal: $ => prec(1, choice(
      $.number,
      $.subscript,
      $.simple_expansion,
      $.expansion,
      $._simple_variable_name,
      $.variable_name,
      $.string,
    )),

    _arithmetic_binary_expression: $ => {
      const table = [
        [choice('+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '&=', '^=', '|='), PREC.UPDATE],
        [choice('=', '=~'), PREC.ASSIGN],
        ['||', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['|', PREC.BITWISE_OR],
        ['^', PREC.BITWISE_XOR],
        ['&', PREC.BITWISE_AND],
        [choice('==', '!='), PREC.EQUALITY],
        [choice('<', '>', '<=', '>='), PREC.COMPARE],
        [choice('<<', '>>'), PREC.SHIFT],
        [choice('+', '-'), PREC.ADD],
        [choice('*', '/', '%'), PREC.MULTIPLY],
        ['**', PREC.EXPONENT],
      ];

      return choice(...table.map(([operator, precedence]) => {
        // @ts-ignore
        return prec.left(precedence, seq(
          field('left', $._arithmetic_expression),
          // @ts-ignore
          field('operator', operator),
          field('right', $._arithmetic_expression),
        ));
      }));
    },

    _arithmetic_ternary_expression: $ => prec.left(PREC.TERNARY, seq(
      field('condition', $._arithmetic_expression),
      '?',
      field('consequence', $._arithmetic_expression),
      ':',
      field('alternative', $._arithmetic_expression),
    )),

    _arithmetic_unary_expression: $ => choice(
      prec(PREC.PREFIX, seq(
        field('operator', tokenLiterals(1, '++', '--')),
        $._arithmetic_expression,
      )),
      prec(PREC.UNARY, seq(
        field('operator', tokenLiterals(1, '-', '+', '~')),
        $._arithmetic_expression,
      )),
      prec.right(PREC.UNARY, seq(
        field('operator', '!'),
        $._arithmetic_expression,
      )),
    ),

    _arithmetic_postfix_expression: $ => prec(PREC.POSTFIX, seq(
      $._arithmetic_expression,
      field('operator', choice('++', '--')),
    )),

    _arithmetic_parenthesized_expression: $ => seq(
      '(',
      $._arithmetic_expression,
      ')',
    ),


    concatenation: $ => prec(-1, seq(
      choice(
        $._primary_expression,
        alias($._special_character, $.word),
      ),
      repeat1(seq(
        choice($._concat, alias(/`\s*`/, '``')),
        choice(
          $._primary_expression,
          alias($._special_character, $.word),
          alias($._comment_word, $.word),
          alias($._bare_dollar, '$'),
        ),
      )),
      optional(seq($._concat, '$')),
    )),

    _special_character: _ => token(prec(-1, choice('{', '}', '[', ']'))),

    string: $ => seq(
      '"',
      repeat(seq(
        choice(
          seq(optional('$'), $.string_content),
          $.expansion,
          $.simple_expansion,
          $.command_substitution,
          $.arithmetic_expansion,
        ),
        optional($._concat),
      )),
      optional('$'),
      '"',
    ),

    string_content: _ => token(prec(-1, /([^"`$\\\r\n]|\\(.|\r?\n))+/)),

    translated_string: $ => seq('$', $.string),

    array: $ => seq(
      '(',
      repeat($._literal),
      ')',
    ),

    raw_string: _ => /'[^']*'/,

    ansi_c_string: _ => /\$'([^']|\\')*'/,

    number: $ => choice(
      /-?(0x)?[0-9]+(#[0-9A-Za-z@_]+)?/,
      // the base can be an expansion or command substitution
      seq(/-?(0x)?[0-9]+#/, choice($.expansion, $.command_substitution)),
    ),

    simple_expansion: $ => seq(
      '$',
      choice(
        $._simple_variable_name,
        $._multiline_variable_name,
        $._special_variable_name,
        $.variable_name,
        alias('!', $.special_variable_name),
        alias('#', $.special_variable_name),
      ),
    ),

    string_expansion: $ => seq('$', $.string),

    expansion: $ => seq(
      '${',
      optional($._expansion_body),
      '}',
    ),
    _expansion_body: $ => choice(
      // ${!##} ${!#}
      repeat1(field(
        'operator',
        choice(
          alias($._external_expansion_sym_hash, '#'),
          alias($._external_expansion_sym_bang, '!'),
          alias($._external_expansion_sym_equal, '='),
        ),
      )),
      seq(
        optional(field('operator', token.immediate('!'))),
        choice($.variable_name, $._simple_variable_name, $._special_variable_name, $.subscript),
        choice(
          $._expansion_expression,
          $._expansion_regex,
          $._expansion_regex_replacement,
          $._expansion_regex_removal,
          $._expansion_max_length,
          $._expansion_operator,
        ),
      ),
      seq(
        field('operator', token.immediate('!')),
        choice($._simple_variable_name, $.variable_name),
        optional(field('operator', choice(
          token.immediate('@'),
          token.immediate('*'),
        ))),
      ),
      seq(
        optional(field('operator', immediateLiterals('#', '!', '='))),
        choice(
          $.subscript,
          $._simple_variable_name,
          $._special_variable_name,
          $.command_substitution,
        ),
        repeat(field(
          'operator',
          choice(
            alias($._external_expansion_sym_hash, '#'),
            alias($._external_expansion_sym_bang, '!'),
            alias($._external_expansion_sym_equal, '='),
          ),
        )),
      ),
    ),

    _expansion_expression: $ => prec(1, seq(
      field('operator', immediateLiterals('=', ':=', '-', ':-', '+', ':+', '?', ':?')),
      optional(seq(
        choice(
          alias($._concatenation_in_expansion, $.concatenation),
          $.command_substitution,
          $.word,
          $.expansion,
          $.simple_expansion,
          $.array,
          $.string,
          $.raw_string,
          $.ansi_c_string,
          alias($._expansion_word, $.word),
        ),
      )),
    )),

    _expansion_regex: $ => seq(
      field('operator', choice('#', alias($._immediate_double_hash, '##'), '%', '%%')),
      repeat(choice(
        $.regex,
        alias(')', $.regex),
        $.string,
        $.raw_string,
        alias(/\s+/, $.regex),
      )),
    ),

    _expansion_regex_replacement: $ => seq(
      field('operator', choice('/', '//', '/#', '/%')),
      optional(choice(
        alias($._regex_no_slash, $.regex),
        $.string,
        $.command_substitution,
        seq($.string, alias($._regex_no_slash, $.regex)),
      )),
      // This can be elided
      optional(seq(
        field('operator', '/'),
        optional(seq(
          choice(
            $._primary_expression,
            alias(prec(-2, repeat1($._special_character)), $.word),
            seq($.command_substitution, alias($._expansion_word, $.word)),
            alias($._expansion_word, $.word),
            alias($._concatenation_in_expansion, $.concatenation),
            $.array,
          ),
          field('operator', optional('/')),
        )),
      )),
    ),

    _expansion_regex_removal: $ => seq(
      field('operator', choice(',', ',,', '^', '^^')),
      optional($.regex),
    ),

    _expansion_max_length: $ => seq(
      field('operator', ':'),
      optional(choice(
        $._simple_variable_name,
        $.number,
        $.arithmetic_expansion,
        $.expansion,
        $.parenthesized_expression,
        $.command_substitution,
        alias($._expansion_max_length_binary_expression, $.binary_expression),
        /\n/,
      )),
      optional(seq(
        field('operator', ':'),
        optional($.simple_expansion),
        optional(choice(
          $._simple_variable_name,
          $.number,
          $.arithmetic_expansion,
          $.expansion,
          $.parenthesized_expression,
          $.command_substitution,
          alias($._expansion_max_length_binary_expression, $.binary_expression),
          /\n/,
        )),
      )),
    ),

    _expansion_max_length_expression: $ => choice(
      $._simple_variable_name,
      $.number,
      $.expansion,
      alias($._expansion_max_length_binary_expression, $.binary_expression),
    ),
    _expansion_max_length_binary_expression: $ => {
      const table = [
        [choice('+', '-'), PREC.ADD],
        [choice('*', '/', '%'), PREC.MULTIPLY],
      ];

      return choice(...table.map(([operator, precedence]) => {
        // @ts-ignore
        return prec.left(precedence, seq(
          $._expansion_max_length_expression,
          // @ts-ignore
          field('operator', operator),
          $._expansion_max_length_expression,
        ));
      }));
    },

    _expansion_operator: _ => seq(
      field('operator', token.immediate('@')),
      field('operator', immediateLiterals('U', 'u', 'L', 'Q', 'E', 'P', 'A', 'K', 'a', 'k')),
    ),

    _concatenation_in_expansion: $ => prec(-2, seq(
      choice(
        $.word,
        $.variable_name,
        $.simple_expansion,
        $.expansion,
        $.string,
        $.raw_string,
        $.ansi_c_string,
        $.command_substitution,
        alias($._expansion_word, $.word),
        $.array,
        $.process_substitution,
      ),
      repeat1(seq(
        choice($._concat, alias(/`\s*`/, '``')),
        choice(
          $.word,
          $.variable_name,
          $.simple_expansion,
          $.expansion,
          $.string,
          $.raw_string,
          $.ansi_c_string,
          $.command_substitution,
          alias($._expansion_word, $.word),
          $.array,
          $.process_substitution,
        ),
      )),
    )),

    command_substitution: $ => choice(
      seq('$(', $._statements, ')'),
      seq('$(', field('redirect', $.file_redirect), ')'),
      prec(1, seq('`', $._statements, '`')),
      seq('$`', $._statements, '`'),
    ),

    process_substitution: $ => seq(
      choice('<(', '>('),
      $._statements,
      ')',
    ),

    _extglob_blob: $ => choice(
      $.extglob_pattern,
      seq(
        $.extglob_pattern,
        choice($.string, $.expansion, $.command_substitution),
        optional($.extglob_pattern),
      ),
    ),

    comment: _ => token(prec(-10, /#.*/)),

    _comment_word: _ => token(prec(-8, seq(
      choice(
        noneOf(...SPECIAL_CHARACTERS),
        seq('\\', noneOf('\\s')),
      ),
      repeat(choice(
        noneOf(...SPECIAL_CHARACTERS),
        seq('\\', noneOf('\\s')),
        '\\ ',
      )),
    ))),

    _simple_variable_name: $ => alias(/\w+/, $.variable_name),
    _multiline_variable_name: $ => alias(
      token(prec(-1, /(\w|\\\r?\n)+/)),
      $.variable_name,
    ),

    _special_variable_name: $ => alias(choice('*', '@', '?', '!', '#', '-', '$', '0', '_'), $.special_variable_name),

    word: _ => token(seq(
      choice(
        noneOf('#', ...SPECIAL_CHARACTERS),
        seq('\\', noneOf('\\s')),
      ),
      repeat(choice(
        noneOf(...SPECIAL_CHARACTERS),
        seq('\\', noneOf('\\s')),
        '\\ ',
      )),
    )),

    _c_terminator: _ => choice(';', /\n/, '&'),
    _terminator: _ => choice(';', ';;', /\n/, '&'),
  },
});

/**
 * Returns a regular expression that matches any character except the ones
 * provided.
 *
 * @param  {...string} characters
 *
 * @returns {RegExp}
 */
function noneOf(...characters) {
  const negatedString = characters.map(c => c == '\\' ? '\\\\' : c).join('');
  return new RegExp('[^' + negatedString + ']');
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

/**
 *
 * Turns a list of rules into a choice of immediate rule
 *
 * @param {(RegExp | string)[]} literals
 *
 * @returns {ChoiceRule}
 */
function immediateLiterals(...literals) {
  return choice(...literals.map(l => token.immediate(l)));
}

/**
 *
 * Turns a list of rules into a choice of aliased token rules
 *
 * @param {number} precedence
 *
 * @param {(RegExp | string)[]} literals
 *
 * @returns {ChoiceRule}
 */
function tokenLiterals(precedence, ...literals) {
  return choice(...literals.map(l => token(prec(precedence, l))));
}
