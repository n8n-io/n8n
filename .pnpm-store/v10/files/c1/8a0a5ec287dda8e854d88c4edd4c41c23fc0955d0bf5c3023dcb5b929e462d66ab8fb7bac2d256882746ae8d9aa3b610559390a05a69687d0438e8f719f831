import { getInteractionCount } from './polyfills/interactionCountPolyfill.js';

/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


// To prevent unnecessary memory usage on pages with lots of interactions,
// store at most 10 of the longest interactions to consider as INP candidates.
const MAX_INTERACTIONS_TO_CONSIDER = 10;

// Used to store the interaction count after a bfcache restore, since p98
// interaction latencies should only consider the current navigation.
let prevInteractionCount = 0;

/**
 * Returns the interaction count since the last bfcache restore (or for the
 * full page lifecycle if there were no bfcache restores).
 */
const getInteractionCountForNavigation = () => {
  return getInteractionCount() - prevInteractionCount;
};

/**
 *
 */
class InteractionManager {constructor() { InteractionManager.prototype.__init.call(this);InteractionManager.prototype.__init2.call(this); }
  /**
   * A list of longest interactions on the page (by latency) sorted so the
   * longest one is first. The list is at most MAX_INTERACTIONS_TO_CONSIDER
   * long.
   */
  // eslint-disable-next-line @sentry-internal/sdk/no-class-field-initializers, @typescript-eslint/explicit-member-accessibility
  __init() {this._longestInteractionList = [];}

  /**
   * A mapping of longest interactions by their interaction ID.
   * This is used for faster lookup.
   */
  // eslint-disable-next-line @sentry-internal/sdk/no-class-field-initializers, @typescript-eslint/explicit-member-accessibility
  __init2() {this._longestInteractionMap = new Map();}

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility, jsdoc/require-jsdoc
  _resetInteractions() {
    prevInteractionCount = getInteractionCount();
    this._longestInteractionList.length = 0;
    this._longestInteractionMap.clear();
  }

  /**
   * Returns the estimated p98 longest interaction based on the stored
   * interaction candidates and the interaction count for the current page.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  _estimateP98LongestInteraction() {
    const candidateInteractionIndex = Math.min(
      this._longestInteractionList.length - 1,
      Math.floor(getInteractionCountForNavigation() / 50),
    );

    return this._longestInteractionList[candidateInteractionIndex];
  }

  /**
   * Takes a performance entry and adds it to the list of worst interactions
   * if its duration is long enough to make it among the worst. If the
   * entry is part of an existing interaction, it is merged and the latency
   * and entries list is updated as needed.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  _processEntry(entry) {
    this._onBeforeProcessingEntry?.(entry);

    // Skip further processing for entries that cannot be INP candidates.
    if (!(entry.interactionId || entry.entryType === 'first-input')) return;

    // The least-long of the 10 longest interactions.
    const minLongestInteraction = this._longestInteractionList.at(-1);

    let interaction = this._longestInteractionMap.get(entry.interactionId);

    // Only process the entry if it's possibly one of the ten longest,
    // or if it's part of an existing interaction.
    if (
      interaction ||
      this._longestInteractionList.length < MAX_INTERACTIONS_TO_CONSIDER ||
      // If the above conditions are false, `minLongestInteraction` will be set.
      entry.duration > minLongestInteraction._latency
    ) {
      // If the interaction already exists, update it. Otherwise create one.
      if (interaction) {
        // If the new entry has a longer duration, replace the old entries,
        // otherwise add to the array.
        if (entry.duration > interaction._latency) {
          interaction.entries = [entry];
          interaction._latency = entry.duration;
        } else if (entry.duration === interaction._latency && entry.startTime === interaction.entries[0].startTime) {
          interaction.entries.push(entry);
        }
      } else {
        interaction = {
          id: entry.interactionId,
          entries: [entry],
          _latency: entry.duration,
        };
        this._longestInteractionMap.set(interaction.id, interaction);
        this._longestInteractionList.push(interaction);
      }

      // Sort the entries by latency (descending) and keep only the top ten.
      this._longestInteractionList.sort((a, b) => b._latency - a._latency);
      if (this._longestInteractionList.length > MAX_INTERACTIONS_TO_CONSIDER) {
        const removedInteractions = this._longestInteractionList.splice(MAX_INTERACTIONS_TO_CONSIDER);

        for (const interaction of removedInteractions) {
          this._longestInteractionMap.delete(interaction.id);
        }
      }

      // Call any post-processing on the interaction
      this._onAfterProcessingINPCandidate?.(interaction);
    }
  }
}

export { InteractionManager };
//# sourceMappingURL=InteractionManager.js.map
