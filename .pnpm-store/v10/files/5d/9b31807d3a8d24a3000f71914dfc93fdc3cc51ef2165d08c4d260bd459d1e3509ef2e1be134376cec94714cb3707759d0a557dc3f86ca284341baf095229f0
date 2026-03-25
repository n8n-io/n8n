/*
Language: Twig
Requires: xml.js
Author: Luke Holder <lukemh@gmail.com>
Description: Twig is a templating language for PHP
Website: https://twig.symfony.com
Category: template
*/

function twig(hljs) {
  const regex = hljs.regex;
  const FUNCTION_NAMES = [
    "absolute_url",
    "asset|0",
    "asset_version",
    "attribute",
    "block",
    "constant",
    "controller|0",
    "country_timezones",
    "csrf_token",
    "cycle",
    "date",
    "dump",
    "expression",
    "form|0",
    "form_end",
    "form_errors",
    "form_help",
    "form_label",
    "form_rest",
    "form_row",
    "form_start",
    "form_widget",
    "html_classes",
    "include",
    "is_granted",
    "logout_path",
    "logout_url",
    "max",
    "min",
    "parent",
    "path|0",
    "random",
    "range",
    "relative_path",
    "render",
    "render_esi",
    "source",
    "template_from_string",
    "url|0"
  ];

  const FILTERS = [
    "abs",
    "abbr_class",
    "abbr_method",
    "batch",
    "capitalize",
    "column",
    "convert_encoding",
    "country_name",
    "currency_name",
    "currency_symbol",
    "data_uri",
    "date",
    "date_modify",
    "default",
    "escape",
    "file_excerpt",
    "file_link",
    "file_relative",
    "filter",
    "first",
    "format",
    "format_args",
    "format_args_as_text",
    "format_currency",
    "format_date",
    "format_datetime",
    "format_file",
    "format_file_from_text",
    "format_number",
    "format_time",
    "html_to_markdown",
    "humanize",
    "inky_to_html",
    "inline_css",
    "join",
    "json_encode",
    "keys",
    "language_name",
    "last",
    "length",
    "locale_name",
    "lower",
    "map",
    "markdown",
    "markdown_to_html",
    "merge",
    "nl2br",
    "number_format",
    "raw",
    "reduce",
    "replace",
    "reverse",
    "round",
    "slice",
    "slug",
    "sort",
    "spaceless",
    "split",
    "striptags",
    "timezone_name",
    "title",
    "trans",
    "transchoice",
    "trim",
    "u|0",
    "upper",
    "url_encode",
    "yaml_dump",
    "yaml_encode"
  ];

  let TAG_NAMES = [
    "apply",
    "autoescape",
    "block",
    "cache",
    "deprecated",
    "do",
    "embed",
    "extends",
    "filter",
    "flush",
    "for",
    "form_theme",
    "from",
    "if",
    "import",
    "include",
    "macro",
    "sandbox",
    "set",
    "stopwatch",
    "trans",
    "trans_default_domain",
    "transchoice",
    "use",
    "verbatim",
    "with"
  ];

  TAG_NAMES = TAG_NAMES.concat(TAG_NAMES.map(t => `end${t}`));

  const STRING = {
    scope: 'string',
    variants: [
      {
        begin: /'/,
        end: /'/
      },
      {
        begin: /"/,
        end: /"/
      },
    ]
  };

  const NUMBER = {
    scope: "number",
    match: /\d+/
  };

  const PARAMS = {
    begin: /\(/,
    end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    contains: [
      STRING,
      NUMBER
    ]
  };


  const FUNCTIONS = {
    beginKeywords: FUNCTION_NAMES.join(" "),
    keywords: { name: FUNCTION_NAMES },
    relevance: 0,
    contains: [ PARAMS ]
  };

  const FILTER = {
    match: /\|(?=[A-Za-z_]+:?)/,
    beginScope: "punctuation",
    relevance: 0,
    contains: [
      {
        match: /[A-Za-z_]+:?/,
        keywords: FILTERS
      },
    ]
  };

  const tagNamed = (tagnames, { relevance }) => {
    return {
      beginScope: {
        1: 'template-tag',
        3: 'name'
      },
      relevance: relevance || 2,
      endScope: 'template-tag',
      begin: [
        /\{%/,
        /\s*/,
        regex.either(...tagnames)
      ],
      end: /%\}/,
      keywords: "in",
      contains: [
        FILTER,
        FUNCTIONS,
        STRING,
        NUMBER
      ]
    };
  };

  const CUSTOM_TAG_RE = /[a-z_]+/;
  const TAG = tagNamed(TAG_NAMES, { relevance: 2 });
  const CUSTOM_TAG = tagNamed([ CUSTOM_TAG_RE ], { relevance: 1 });

  return {
    name: 'Twig',
    aliases: [ 'craftcms' ],
    case_insensitive: true,
    subLanguage: 'xml',
    contains: [
      hljs.COMMENT(/\{#/, /#\}/),
      TAG,
      CUSTOM_TAG,
      {
        className: 'template-variable',
        begin: /\{\{/,
        end: /\}\}/,
        contains: [
          'self',
          FILTER,
          FUNCTIONS,
          STRING,
          NUMBER
        ]
      }
    ]
  };
}

module.exports = twig;
