# Search snapshots

This directory contains snapshots containing real data fed into the sublimeSearch function.

These were obtained via `console.log(items)` right before the sublimeSearch call in `editor-ui` (currently in `packages/frontend/editor-ui/src/components/Node/NodeCreator/utils.ts`)
Which is triggered by typing in the search bar in varying states of the application:

- toplevel: From an empty workflow (so missing e.g. tools)


After typing in the search bar you should see an object in the console you can copy via `Right Click->Copy Object" in Firefox or Chrome which will cleanly paste to json.
