import { Config, ResolvableTo, ThemeConfig } from './types/config'
import { DefaultTheme } from './types/generated/default-theme'
import { DefaultColors } from './types/generated/colors'

type ResolvedConfig<T extends Config> = Omit<T, 'theme'> & {
  theme: MergeThemes<
    UnwrapResolvables<Omit<T['theme'], 'extend'>>,
    T['theme'] extends { extend: infer TExtend } ? UnwrapResolvables<TExtend> : {}
  >
}

type UnwrapResolvables<T> = {
  [K in keyof T]: T[K] extends ResolvableTo<infer R> ? R : T[K]
}

type ThemeConfigResolved = UnwrapResolvables<ThemeConfig>
type DefaultThemeFull = DefaultTheme & { colors: DefaultColors }

type MergeThemes<Overrides extends object, Extensions extends object> = {
  [K in keyof ThemeConfigResolved | keyof Overrides]: (K extends keyof Overrides
    ? Overrides[K]
    : K extends keyof DefaultThemeFull
    ? DefaultThemeFull[K]
    : K extends keyof ThemeConfigResolved
    ? ThemeConfigResolved[K]
    : never) &
    (K extends keyof Extensions ? Extensions[K] : {})
}

declare function resolveConfig<T extends Config>(config: T): ResolvedConfig<T>
export = resolveConfig
