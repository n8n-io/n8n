import { STICKY_NODE_TYPE } from '@/constants';
import type { Diagnostic } from '@codemirror/lint';
import type { CodeExecutionMode, CodeNodeEditorLanguage } from 'n8n-workflow';

export const NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION = [STICKY_NODE_TYPE];

export const DEFAULT_LINTER_SEVERITY: Diagnostic['severity'] = 'error';

export const DEFAULT_LINTER_DELAY_IN_MS = 300;

export const CODE_PLACEHOLDERS: Partial<
	Record<CodeNodeEditorLanguage, Record<CodeExecutionMode, string>>
> = {
	javaScript: {
		runOnceForAllItems: `
// Loop over input items and add a new field called 'myNewField' to the JSON of each one
for (const item of $input.all()) {
  item.json.myNewField = 1;
}

return $input.all();`.trim(),
		runOnceForEachItem: `
// Add a new field called 'myNewField' to the JSON of the item
$input.item.json.myNewField = 1;

return $input.item;`.trim(),
	},
	python: {
		runOnceForAllItems: `
# Loop over input items and add a new field called 'myNewField' to the JSON of each one
for item in _input.all():
	item.json.myNewField = 1
return _input.all()`.trim(),
		runOnceForEachItem: `
# Add a new field called 'myNewField' to the JSON of the item
_input.item.json.myNewField = 1
return _input.item`.trim(),
	},
};
