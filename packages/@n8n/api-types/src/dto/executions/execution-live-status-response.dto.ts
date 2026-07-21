/**
 * Live state of an execution, used by the editor to reconcile executing-node
 * state after a push reconnect or a background-tab visibility regain
 * (CAT-2895 Option B). The frontend restores the correct spinner from a
 * `running` response, clears it on `finished`, and — critically — keeps its
 * current state on `unknown`.
 *
 * The three states never collapse: `unknown` (this main cannot resolve the
 * execution's live state) must not be reported as `finished`, otherwise the
 * frontend would clear a spinner for a run that may still be executing —
 * exactly the stale-spinner bug this seam exists to fix.
 */
export type ExecutionLiveStatus =
	| {
			/** The execution is running on the main process that served this request. */
			state: 'running';
			/**
			 * Nodes currently in flight — a `nodeExecuteBefore` has fired without a
			 * matching `nodeExecuteAfter`. Ground truth from the execution lifecycle,
			 * never a guess or a stale value. Usually holds exactly one node; may hold
			 * more than one while a sub-node executes inside a still-running parent
			 * node (both have an open start). Empty while the execution is active but
			 * momentarily between nodes (e.g. a waiting execution).
			 */
			nodes: string[];
			/**
			 * Latest node-event sequence number emitted for this execution segment,
			 * mirroring the `sequenceNumber` on the `nodeExecuteBefore` /
			 * `nodeExecuteAfter` push events. Seeds the frontend's
			 * `latestSequenceNumber` so late or out-of-order push events are ignored.
			 * `-1` when no node event has fired yet this segment (matches the
			 * frontend's default), which also resets across a waiting-execution resume.
			 */
			sequenceNumber: number;
	  }
	| {
			/**
			 * The execution has reached a terminal status (success, error, crashed or
			 * canceled). The frontend clears any executing-node spinner.
			 */
			state: 'finished';
	  }
	| {
			/**
			 * The main process serving this request cannot resolve the execution's
			 * live state — it does not hold the run. In queue mode (multi-main, out of
			 * scope for v1) the run may be executing on another main whose in-flight
			 * node state is not visible here. The frontend keeps its current state and
			 * must not clear the spinner on this.
			 */
			state: 'unknown';
	  };
