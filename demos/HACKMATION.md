# Hackmation demo

This branch combines the real canvas effects and workflow artwork tools.
It is a temporary demo branch. Do not merge it into master.

- Leave a disconnected node idle for three seconds. It falls asleep. Move the pointer to wake it.
- Delete a sticky note with the toolbar, context menu, or keyboard. A paper bird flies away. Undo restores the note immediately.
- Zoom out to less than 15.5% to start the constellation. The full effect appears at about 8.7%. The Northstar sample needs about eight zoom-out clicks after Zoom to Fit. The exact count depends on the window size.
- At low zoom, select Save constellation artwork to export SVG or PNG. Type stardust outside a text field to open it at any zoom.
- Select the print studio button above the canvas for the print variations and PNG, SVG, or STL export. Alt+Shift+P also opens it.
- Open the browser console for the pink n8n logo. Application console output is muted in this demo.

The deployment enables the effects through `src/app/hackmation.ts` in editor-ui. It does not depend on local environment files or development mode.

Use `canvas-delight/real-workflow.json` and the constellation `demo/northstar-workflow.json` as sample workflows. The samples do not need to run to show the effects.
