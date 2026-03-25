/*
  This file draws heavily from https://github.com/phoenixframework/phoenix/blob/d344ec0a732ab4ee204215b31de69cf4be72e3bf/assets/js/phoenix/presence.js
  License: https://github.com/phoenixframework/phoenix/blob/d344ec0a732ab4ee204215b31de69cf4be72e3bf/LICENSE.md
*/

import type {
  PresenceOpts,
  PresenceOnJoinCallback,
  PresenceOnLeaveCallback,
} from 'phoenix'
import type RealtimeChannel from './RealtimeChannel'

type Presence<T extends { [key: string]: any } = {}> = {
  presence_ref: string
} & T

export type RealtimePresenceState<T extends { [key: string]: any } = {}> = {
  [key: string]: Presence<T>[]
}

export type RealtimePresenceJoinPayload<T extends { [key: string]: any }> = {
  event: `${REALTIME_PRESENCE_LISTEN_EVENTS.JOIN}`
  key: string
  currentPresences: Presence<T>[]
  newPresences: Presence<T>[]
}

export type RealtimePresenceLeavePayload<T extends { [key: string]: any }> = {
  event: `${REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE}`
  key: string
  currentPresences: Presence<T>[]
  leftPresences: Presence<T>[]
}

export enum REALTIME_PRESENCE_LISTEN_EVENTS {
  SYNC = 'sync',
  JOIN = 'join',
  LEAVE = 'leave',
}

type PresenceDiff = {
  joins: RealtimePresenceState
  leaves: RealtimePresenceState
}

type RawPresenceState = {
  [key: string]: {
    metas: {
      phx_ref?: string
      phx_ref_prev?: string
      [key: string]: any
    }[]
  }
}

type RawPresenceDiff = {
  joins: RawPresenceState
  leaves: RawPresenceState
}

type PresenceChooser<T> = (key: string, presences: Presence[]) => T

export default class RealtimePresence {
  state: RealtimePresenceState = {}
  pendingDiffs: RawPresenceDiff[] = []
  joinRef: string | null = null
  caller: {
    onJoin: PresenceOnJoinCallback
    onLeave: PresenceOnLeaveCallback
    onSync: () => void
  } = {
    onJoin: () => {},
    onLeave: () => {},
    onSync: () => {},
  }

  /**
   * Initializes the Presence.
   *
   * @param channel - The RealtimeChannel
   * @param opts - The options,
   *        for example `{events: {state: 'state', diff: 'diff'}}`
   */
  constructor(public channel: RealtimeChannel, opts?: PresenceOpts) {
    const events = opts?.events || {
      state: 'presence_state',
      diff: 'presence_diff',
    }

    this.channel._on(events.state, {}, (newState: RawPresenceState) => {
      const { onJoin, onLeave, onSync } = this.caller

      this.joinRef = this.channel._joinRef()

      this.state = RealtimePresence.syncState(
        this.state,
        newState,
        onJoin,
        onLeave
      )

      this.pendingDiffs.forEach((diff) => {
        this.state = RealtimePresence.syncDiff(
          this.state,
          diff,
          onJoin,
          onLeave
        )
      })

      this.pendingDiffs = []

      onSync()
    })

    this.channel._on(events.diff, {}, (diff: RawPresenceDiff) => {
      const { onJoin, onLeave, onSync } = this.caller

      if (this.inPendingSyncState()) {
        this.pendingDiffs.push(diff)
      } else {
        this.state = RealtimePresence.syncDiff(
          this.state,
          diff,
          onJoin,
          onLeave
        )

        onSync()
      }
    })

    this.onJoin((key, currentPresences, newPresences) => {
      this.channel._trigger('presence', {
        event: 'join',
        key,
        currentPresences,
        newPresences,
      })
    })

    this.onLeave((key, currentPresences, leftPresences) => {
      this.channel._trigger('presence', {
        event: 'leave',
        key,
        currentPresences,
        leftPresences,
      })
    })

    this.onSync(() => {
      this.channel._trigger('presence', { event: 'sync' })
    })
  }

  /**
   * Used to sync the list of presences on the server with the
   * client's state.
   *
   * An optional `onJoin` and `onLeave` callback can be provided to
   * react to changes in the client's local presences across
   * disconnects and reconnects with the server.
   *
   * @internal
   */
  private static syncState(
    currentState: RealtimePresenceState,
    newState: RawPresenceState | RealtimePresenceState,
    onJoin: PresenceOnJoinCallback,
    onLeave: PresenceOnLeaveCallback
  ): RealtimePresenceState {
    const state = this.cloneDeep(currentState)
    const transformedState = this.transformState(newState)
    const joins: RealtimePresenceState = {}
    const leaves: RealtimePresenceState = {}

    this.map(state, (key: string, presences: Presence[]) => {
      if (!transformedState[key]) {
        leaves[key] = presences
      }
    })

    this.map(transformedState, (key, newPresences: Presence[]) => {
      const currentPresences: Presence[] = state[key]

      if (currentPresences) {
        const newPresenceRefs = newPresences.map(
          (m: Presence) => m.presence_ref
        )
        const curPresenceRefs = currentPresences.map(
          (m: Presence) => m.presence_ref
        )
        const joinedPresences: Presence[] = newPresences.filter(
          (m: Presence) => curPresenceRefs.indexOf(m.presence_ref) < 0
        )
        const leftPresences: Presence[] = currentPresences.filter(
          (m: Presence) => newPresenceRefs.indexOf(m.presence_ref) < 0
        )

        if (joinedPresences.length > 0) {
          joins[key] = joinedPresences
        }

        if (leftPresences.length > 0) {
          leaves[key] = leftPresences
        }
      } else {
        joins[key] = newPresences
      }
    })

    return this.syncDiff(state, { joins, leaves }, onJoin, onLeave)
  }

  /**
   * Used to sync a diff of presence join and leave events from the
   * server, as they happen.
   *
   * Like `syncState`, `syncDiff` accepts optional `onJoin` and
   * `onLeave` callbacks to react to a user joining or leaving from a
   * device.
   *
   * @internal
   */
  private static syncDiff(
    state: RealtimePresenceState,
    diff: RawPresenceDiff | PresenceDiff,
    onJoin: PresenceOnJoinCallback,
    onLeave: PresenceOnLeaveCallback
  ): RealtimePresenceState {
    const { joins, leaves } = {
      joins: this.transformState(diff.joins),
      leaves: this.transformState(diff.leaves),
    }

    if (!onJoin) {
      onJoin = () => {}
    }

    if (!onLeave) {
      onLeave = () => {}
    }

    this.map(joins, (key, newPresences: Presence[]) => {
      const currentPresences: Presence[] = state[key] ?? []
      state[key] = this.cloneDeep(newPresences)

      if (currentPresences.length > 0) {
        const joinedPresenceRefs = state[key].map(
          (m: Presence) => m.presence_ref
        )
        const curPresences: Presence[] = currentPresences.filter(
          (m: Presence) => joinedPresenceRefs.indexOf(m.presence_ref) < 0
        )

        state[key].unshift(...curPresences)
      }

      onJoin(key, currentPresences, newPresences)
    })

    this.map(leaves, (key, leftPresences: Presence[]) => {
      let currentPresences: Presence[] = state[key]

      if (!currentPresences) return

      const presenceRefsToRemove = leftPresences.map(
        (m: Presence) => m.presence_ref
      )
      currentPresences = currentPresences.filter(
        (m: Presence) => presenceRefsToRemove.indexOf(m.presence_ref) < 0
      )

      state[key] = currentPresences

      onLeave(key, currentPresences, leftPresences)

      if (currentPresences.length === 0) delete state[key]
    })

    return state
  }

  /** @internal */
  private static map<T = any>(
    obj: RealtimePresenceState,
    func: PresenceChooser<T>
  ): T[] {
    return Object.getOwnPropertyNames(obj).map((key) => func(key, obj[key]))
  }

  /**
   * Remove 'metas' key
   * Change 'phx_ref' to 'presence_ref'
   * Remove 'phx_ref' and 'phx_ref_prev'
   *
   * @example
   * // returns {
   *  abc123: [
   *    { presence_ref: '2', user_id: 1 },
   *    { presence_ref: '3', user_id: 2 }
   *  ]
   * }
   * RealtimePresence.transformState({
   *  abc123: {
   *    metas: [
   *      { phx_ref: '2', phx_ref_prev: '1' user_id: 1 },
   *      { phx_ref: '3', user_id: 2 }
   *    ]
   *  }
   * })
   *
   * @internal
   */
  private static transformState(
    state: RawPresenceState | RealtimePresenceState
  ): RealtimePresenceState {
    state = this.cloneDeep(state)

    return Object.getOwnPropertyNames(state).reduce((newState, key) => {
      const presences = state[key]

      if ('metas' in presences) {
        newState[key] = presences.metas.map((presence) => {
          presence['presence_ref'] = presence['phx_ref']

          delete presence['phx_ref']
          delete presence['phx_ref_prev']

          return presence
        }) as Presence[]
      } else {
        newState[key] = presences
      }

      return newState
    }, {} as RealtimePresenceState)
  }

  /** @internal */
  private static cloneDeep(obj: { [key: string]: any }) {
    return JSON.parse(JSON.stringify(obj))
  }

  /** @internal */
  private onJoin(callback: PresenceOnJoinCallback): void {
    this.caller.onJoin = callback
  }

  /** @internal */
  private onLeave(callback: PresenceOnLeaveCallback): void {
    this.caller.onLeave = callback
  }

  /** @internal */
  private onSync(callback: () => void): void {
    this.caller.onSync = callback
  }

  /** @internal */
  private inPendingSyncState(): boolean {
    return !this.joinRef || this.joinRef !== this.channel._joinRef()
  }
}
