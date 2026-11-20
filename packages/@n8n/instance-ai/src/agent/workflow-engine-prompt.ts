import { getEngineV2BuildRules } from '@n8n/workflow-sdk/prompts/sdk-reference';

import type { InstanceAiEngineSetup } from '../types';
import { newWorkflowEngine } from '../tools/workflows/target-engine';

/**
 * Tells the model which engine runs the workflows it builds, and what engine v2 cannot
 * do yet. Without the `engine-v2` module every workflow runs on v1, so the section is
 * empty and the prompt stays the same. The setup is the same for the whole instance,
 * so the section does not split the prompt cache within one instance.
 */
export function getWorkflowEngineSection(engineSetup?: InstanceAiEngineSetup): string {
	if (engineSetup?.engineV2Available !== true) return '';

	const defaultEngine = newWorkflowEngine(engineSetup);
	return `
## Workflow Engine

This instance has two workflow engines, v1 and v2. New workflows run on engine ${defaultEngine}.

- The engine of a saved workflow is \`engineType\` in its \`workflow()\` settings. A workflow without \`engineType\` runs on engine v1.
- Keep an existing workflow on its engine. Change \`engineType\` only when the user asks for a different engine. Do not set \`engineType\` on a new workflow unless the user asks for an engine.
- The build result names the target engine, for example "target engine: v2 (instance default)".
- When you build for engine v2, use the v2-safe patterns below. They win over skill, cue and reference text that recommends \`executeOnce\`, \`alwaysOutputData\`, \`retryOnFail\` or the error output.
- Use engine v1 only when the workflow must have a behaviour that engine v2 cannot give. For a new workflow, set \`engineType: 'v1'\` in the \`workflow()\` settings, for example \`workflow('id', 'Name', { engineType: 'v1' })\`, and tell the user why. For an existing v2 workflow, ask the user before you move it to engine v1.

What engine v2 cannot do yet:

${getEngineV2BuildRules()}

For a v2 workflow, do not offer a skill step that needs an item of this list, for example an error workflow while engine v2 does not support error workflows.
`;
}
