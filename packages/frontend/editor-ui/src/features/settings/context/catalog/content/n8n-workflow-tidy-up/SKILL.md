---
name: n8n-workflow-tidy-up
description: Organize an n8n workflow canvas and add useful documentation. Use for tangled layouts, unclear workflow stages, overlapping sticky notes, or a workflow handoff. Requires workflow JSON from the user or n8n workflow tools. Visual verification also requires access to the canvas.
license: MIT
---

# Tidy an n8n workflow

## Requirements

Read the workflow through the available n8n tools. If no tool can read it, ask
for its JSON. Work from the actual nodes and connections. Do not assume the
workflow harness, its Python scripts, or a browser tool is installed.

## Inspect and organize

1. Identify the trigger, main path, branches, loops, AI sub-nodes, and error paths.
2. Divide the workflow into meaningful stages, such as receive, validate,
   enrich, and store. Use the existing structure when it is clear.
3. Lay out each stage from left to right. Keep branches near their source node.
   Keep model, memory, and tool sub-nodes near their parent.
4. Leave room for node labels and connection lines. Use consistent gaps. Wrap
   long workflows into rows without routing connections through other stages.
5. Add a short sticky note where the purpose or a constraint is unclear. Explain
   why the stage exists. Keep notes outside node labels and connection paths.
6. Add one setup note when useful. State the trigger, required credentials,
   configuration inputs, expected output, and how to verify an execution.

Use existing canvas groups if the available tools support them. Preserve all
groups outside the requested change. Do not invent a group-editing operation.

## Preserve execution behavior

Keep node identifiers, types, parameters, credentials, connections, and workflow
settings unchanged during a layout-only edit. Avoid renaming executable nodes:
expressions and connections can refer to their names. A rename needs an explicit
reference update and validation.

Canvas position can affect branch execution order. Preserve the relative
vertical order of nodes at a fan-out. If a proposed layout changes that order,
explain the effect before applying it. Do not publish or execute the workflow
just to check its layout.

## Verify and hand off

Read the saved workflow back. Compare its executable configuration with the
original. Confirm that every original node and connection remains. Check for
unintended changes to branch order or group membership.

If canvas access is available, inspect the rendered layout. Look for overlapping
notes, clipped captions, and connections that cross text. If no visual tool is
available, report that the layout still needs a visual check. Do not claim that
a JSON-only review proves that the canvas is readable.

Summarize the stages, the documentation added, and the verification performed.

Adapted from [n8n canvas documentation by Michael Frostbutter](https://github.com/Mfrostbutter/n8n-workflow-harness/tree/6cbb8e09b5b16ee01f0d5734dc512f8748e730b2/.agents/skills/n8n-canvas-docs).
This version uses available n8n tools and does not require the harness scripts.

## License

MIT License

Copyright (c) 2026 Michael Frostbutter

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
