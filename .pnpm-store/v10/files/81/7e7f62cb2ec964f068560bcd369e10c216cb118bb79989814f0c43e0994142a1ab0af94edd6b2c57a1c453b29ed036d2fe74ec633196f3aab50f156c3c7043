import type { Config, PluginCreator } from './types/config'
type Plugin = {
  withOptions<T>(
    plugin: (options: T) => PluginCreator,
    config?: (options: T) => Partial<Config>
  ): { (options: T): { handler: PluginCreator; config?: Partial<Config> }; __isOptionsFunction: true }
  (plugin: PluginCreator, config?: Partial<Config>): { handler: PluginCreator; config?: Partial<Config> }
}

declare const plugin: Plugin
export = plugin
