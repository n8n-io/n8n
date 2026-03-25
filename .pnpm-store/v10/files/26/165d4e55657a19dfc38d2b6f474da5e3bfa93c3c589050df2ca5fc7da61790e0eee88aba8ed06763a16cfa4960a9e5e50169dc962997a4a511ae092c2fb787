/// <reference types="node" />

import { Profiler } from 'inspector'
import { CoverageMapData } from 'istanbul-lib-coverage'
import { SourceMapInput } from '@jridgewell/trace-mapping'

declare type Sources =
  | {
      source: string
    }
  | {
      source: string
      originalSource: string
      sourceMap: { sourcemap: SourceMapInput }
    }
declare class V8ToIstanbul {
  load(): Promise<void>
  destroy(): void
  applyCoverage(blocks: ReadonlyArray<Profiler.FunctionCoverage>): void
  toIstanbul(): CoverageMapData
}

declare function v8ToIstanbul(scriptPath: string, wrapperLength?: number, sources?: Sources, excludePath?: (path: string) => boolean): V8ToIstanbul

export = v8ToIstanbul
