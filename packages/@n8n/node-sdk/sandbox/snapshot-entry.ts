// The template of the per-bundle snapshot guests (`dist/action-snapshot.js`): the action guest that
// evaluates its bundle at the top level. ComponentizeJS runs the top level during the Wizer
// snapshot, so each instance starts with the bundle evaluated. `scripts/snapshot-bundle.ts`
// replaces `N8N_SNAPSHOT_BUNDLE_SOURCE` with the code of a verified bundle and
// `N8N_SNAPSHOT_SDK_SOURCE` with the SDK runtime that it pins ('' for a self-contained bundle).
import { evaluateBundle } from './guest';

export { action } from './action';

declare const N8N_SNAPSHOT_BUNDLE_SOURCE: string;
declare const N8N_SNAPSHOT_SDK_SOURCE: string;

evaluateBundle(N8N_SNAPSHOT_BUNDLE_SOURCE, N8N_SNAPSHOT_SDK_SOURCE);
