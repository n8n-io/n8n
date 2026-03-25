/// <reference types="node" />
export namespace ProcessOnSpawn {
  export interface SpawnOptions {
    env: NodeJS.ProcessEnv
    cwd: string
    execPath: string
    args: ReadonlyArray<string>
    detached: boolean
    uid?: number
    gid?: number
    windowsVerbatimArguments: boolean
    windowsHide: boolean
  }
  export type Handler = (opts: SpawnOptions) => any
}
export function addListener(fn: ProcessOnSpawn.Handler): void
export function prependListener(fn: ProcessOnSpawn.Handler): void
export function removeListener(fn: ProcessOnSpawn.Handler): void
export function removeAllListeners(): void
