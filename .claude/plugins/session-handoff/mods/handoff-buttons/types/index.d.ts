declare module 'claude-code' {
  interface PluginState {
    'handoff-buttons': { isFresh: boolean, lastReplyAt: number, handoff: '' | 'asked' | 'done', transcript: string, cacheMs: number }
  }
}
