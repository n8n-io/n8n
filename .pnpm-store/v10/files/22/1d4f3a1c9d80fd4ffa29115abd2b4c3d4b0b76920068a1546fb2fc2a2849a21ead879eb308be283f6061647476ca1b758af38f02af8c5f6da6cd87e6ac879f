/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-ignore `esbuild` may not be installed
import type esbuild from 'esbuild'

/* eslint-enable @typescript-eslint/ban-ts-comment */

export type EsbuildTarget = string | string[]

export type EsbuildLoader = esbuild.Loader
export type EsbuildTransformOptions = esbuild.TransformOptions
export type EsbuildTransformResult = esbuild.TransformResult

export type EsbuildMessage = esbuild.Message

export type DepsOptimizerEsbuildOptions = Omit<
  esbuild.BuildOptions,
  | 'bundle'
  | 'entryPoints'
  | 'external'
  | 'write'
  | 'watch'
  | 'outdir'
  | 'outfile'
  | 'outbase'
  | 'outExtension'
  | 'metafile'
>
