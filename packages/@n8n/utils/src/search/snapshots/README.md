# Search snapshots

This directory contains snapshots containing real data fed into the sublimeSearch function.

These were obtained via `console.log(items)` right before the sublimeSearch call in `editor-ui` (currently in `packages/frontend/editor-ui/src/components/Node/NodeCreator/utils.ts`)
Which is triggered by typing in the search bar in varying states of the application:

- toplevel: From an empty workflow (so missing e.g. tools)


After typing in the search bar you should see an object in the console you can copy via `Right Click->Copy Object" which will cleanly paste to json.

**Please use Chrome for capturing these - the recovered object in Chrome is about 3x larger than in Firefox due to Firefox dropping some nested values**
