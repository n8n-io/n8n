import { Linter, Rule, ESLint } from 'eslint';
import { UnprefixedRuleOptions } from './rule-options.js';
export { RuleOptions } from './rule-options.js';

interface StylisticCustomizeOptions {
  /**
   * The name of the registered plugin, used to prefix rule IDs
   * @default '@stylistic'
   */
  pluginName?: string
  /**
   * Indentation level
   * Similar to the `tabWidth` and `useTabs` options in Prettier
   *
   * @default 2
   */
  indent?: number | 'tab'
  /**
   * Quote style
   * Similar to `singleQuote` option in Prettier
   *
   * @default 'single'
   */
  quotes?: 'single' | 'double' | 'backtick'
  /**
   * Whether to enable semicolons
   * Similar to `semi` option in Prettier
   *
   * @default false
   */
  semi?: boolean
  /**
   * Enable JSX support
   * @default true
   */
  jsx?: boolean
  /**
   * When to enable arrow parenthesis
   * Similar to `arrowParens` option in Prettier
   *
   * @default false
   */
  arrowParens?: boolean
  /**
   * Which brace style to use
   * @default 'stroustrup'
   */
  braceStyle?: '1tbs' | 'stroustrup' | 'allman'
  /**
   * Whether to require spaces around braces
   * Similar to `bracketSpacing` option in Prettier
   *
   * @default true
   */
  blockSpacing?: boolean
  /**
   * When to enable prop quoting
   * Similar to `quoteProps` option in Prettier
   *
   * @default 'consistent-as-needed'
   */
  quoteProps?: 'always' | 'as-needed' | 'consistent' | 'consistent-as-needed'
  /**
   * When to enable comma dangles
   * Similar to `trailingComma` option in Prettier
   *
   * @default 'always-multiline'
   */
  commaDangle?: 'never' | 'always' | 'always-multiline' | 'only-multiline'
  /**
   * Severity level of the rules
   * Determines how violations are reported.
   *
   * @default 'error'
   */
  severity?: 'error' | 'warn'
}

declare function customize(options?: StylisticCustomizeOptions): Linter.Config

declare const configs: {
  /**
   * Disable all legacy rules from `eslint`, `@typescript-eslint` and `eslint-plugin-react`
   *
   * This config works for both flat and legacy config format
   */
  'disable-legacy': Linter.Config
  /**
   * A factory function to customize the recommended config
   */
  'customize': typeof customize
  /**
   * The default recommended config in Flat Config Format
   */
  'recommended': Linter.Config
  /**
   * The default recommended config in Flat Config Format
   *
   * @deprecated use `recommended` instead.
   */
  'recommended-flat': Linter.Config
  /**
   * Enable all rules, in Flat Config Format
   */
  'all': Linter.Config
  /**
   * Enable all rules, in Flat Config Format
   *
   * @deprecated use `all` instead.
   */
  'all-flat': Linter.Config
}

type Configs = typeof configs

type Rules = {
  [K in keyof UnprefixedRuleOptions]: Rule.RuleModule
}

declare const plugin: {
  rules: Rules
  configs: ESLint.Plugin['configs'] & Configs
}

export { UnprefixedRuleOptions, plugin as default };
export type { Configs, Rules, StylisticCustomizeOptions };
