// based on @types/postcss-load-config@2.0.1
// Type definitions for postcss-load-config 2.1
import Processor from 'postcss/lib/processor'
import { Plugin, ProcessOptions, Transformer } from 'postcss'
import { Options as ConfigOptions } from 'lilconfig'

declare function postcssrc(
  ctx?: postcssrc.ConfigContext,
  path?: string,
  options?: ConfigOptions
): Promise<postcssrc.Result>

declare namespace postcssrc {
  // In the ConfigContext, these three options can be instances of the
  // appropriate class, or strings. If they are strings, postcss-load-config will
  // require() them and pass the instances along.
  export interface ProcessOptionsPreload {
    parser?: string | ProcessOptions['parser']
    stringifier?: string | ProcessOptions['stringifier']
    syntax?: string | ProcessOptions['syntax']
  }

  // The remaining ProcessOptions, sans the three above.
  export type RemainingProcessOptions = Pick<
    ProcessOptions,
    Exclude<keyof ProcessOptions, keyof ProcessOptionsPreload>
  >

  // Additional context options that postcss-load-config understands.
  export interface Context {
    cwd?: string
    env?: string
  }

  // The full shape of the ConfigContext.
  export type ConfigContext = Context &
    ProcessOptionsPreload &
    RemainingProcessOptions

  // Result of postcssrc is a Promise containing the filename plus the options
  // and plugins that are ready to pass on to postcss.
  export type ResultPlugin = Plugin | Transformer | Processor

  export interface Result {
    file: string
    options: ProcessOptions
    plugins: ResultPlugin[]
  }

  export type ConfigPlugin = Transformer | Plugin | Processor

  export interface Config {
    parser?: string | ProcessOptions['parser'] | false
    stringifier?: string | ProcessOptions['stringifier'] | false
    syntax?: string | ProcessOptions['syntax'] | false
    map?: string | false
    from?: string
    to?: string
    plugins?: Array<ConfigPlugin | false> | Record<string, object | false>
  }

  export type ConfigFn = (ctx: ConfigContext) => Config | Promise<Config>
}

export = postcssrc
