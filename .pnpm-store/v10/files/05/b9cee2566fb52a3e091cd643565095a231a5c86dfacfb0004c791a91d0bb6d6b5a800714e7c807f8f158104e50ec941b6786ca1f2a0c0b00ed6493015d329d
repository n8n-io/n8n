/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-ignore `sass` may not be installed
import type DartSass from 'sass'
// @ts-ignore `sass-embedded` may not be installed
import type SassEmbedded from 'sass-embedded'
// @ts-ignore `less` may not be installed
import type Less from 'less'
// @ts-ignore `stylus` may not be installed
import type Stylus from 'stylus'

/* eslint-enable @typescript-eslint/ban-ts-comment */

// https://github.com/type-challenges/type-challenges/issues/29285
type IsAny<T> = boolean extends (T extends never ? true : false) ? true : false

type DartSassLegacyStringOptionsAsync = DartSass.LegacyStringOptions<'async'>
type SassEmbeddedLegacyStringOptionsAsync =
  SassEmbedded.LegacyStringOptions<'async'>
type SassLegacyStringOptionsAsync =
  IsAny<DartSassLegacyStringOptionsAsync> extends false
    ? DartSassLegacyStringOptionsAsync
    : SassEmbeddedLegacyStringOptionsAsync

export type SassLegacyPreprocessBaseOptions = Omit<
  SassLegacyStringOptionsAsync,
  | 'data'
  | 'file'
  | 'outFile'
  | 'sourceMap'
  | 'omitSourceMapUrl'
  | 'sourceMapEmbed'
  | 'sourceMapRoot'
>

type DartSassStringOptionsAsync = DartSass.StringOptions<'async'>
type SassEmbeddedStringOptionsAsync = SassEmbedded.StringOptions<'async'>
type SassStringOptionsAsync =
  IsAny<DartSassStringOptionsAsync> extends false
    ? DartSassStringOptionsAsync
    : SassEmbeddedStringOptionsAsync

export type SassModernPreprocessBaseOptions = Omit<
  SassStringOptionsAsync,
  'url' | 'sourceMap'
>

export type LessPreprocessorBaseOptions = Omit<
  Less.Options,
  'sourceMap' | 'filename'
>

export type StylusPreprocessorBaseOptions = Omit<
  Stylus.RenderOptions,
  'filename'
> & { define?: Record<string, any> }

declare global {
  // LESS' types somewhat references this which doesn't make sense in Node,
  // so we have to shim it
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLLinkElement {}
}
