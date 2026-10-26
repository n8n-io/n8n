import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRekaUiContextMenuRule } from './no-reka-ui-context-menu.js';

const ruleTester = new RuleTester();

const wrapperPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nContextMenu/ContextMenu.vue';
const wrapperWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nContextMenu\\ContextMenuItem.vue';

const error = (name: string) => ({
	messageId: 'noRekaUiContextMenu' as const,
	data: { name },
});

ruleTester.run('no-reka-ui-context-menu', NoRekaUiContextMenuRule, {
	valid: [
		// Other Reka UI primitives stay allowed — reka-ui is a mixed module.
		{ code: "import { SelectRoot, DialogRoot } from 'reka-ui';" },
		{ code: "import { SelectRoot as Root } from 'reka-ui';" },
		{ code: "export { SelectRoot } from 'reka-ui';" },
		{ code: "import type { SelectRootProps } from 'reka-ui';" },
		// Same export name from an unrelated package.
		{ code: "import { ContextMenuRoot } from 'some-other-pkg';" },
		{ code: "import { N8nContextMenu } from '@n8n/design-system';" },
		// Allowed wrapper (posix and windows separators).
		{
			name: 'named context menu import in the allowed wrapper path',
			code: "import { ContextMenuRoot } from 'reka-ui';",
			filename: wrapperPath,
		},
		{
			name: 're-export in the allowed wrapper path (windows separators)',
			code: "export { ContextMenuRoot, ContextMenuItem } from 'reka-ui';",
			filename: wrapperWindowsPath,
		},
		// Namespace / star forms do not name a ContextMenu* specifier, so they are out of scope.
		// Closing them would false-positive mixed-module `import * as Reka from 'reka-ui'`.
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
		{ name: 'star re-export bypass', code: "export * from 'reka-ui';" },
		{ name: 'namespace re-export bypass', code: "export * as Reka from 'reka-ui';" },
		{ name: 'default import bypass', code: "import Reka from 'reka-ui';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ContextMenuRoot } from 'reka-ui';",
			errors: [error('ContextMenuRoot')],
		},
		{
			name: 'aliased import — flagged by the original export name',
			code: "import { ContextMenuRoot as Root } from 'reka-ui';",
			errors: [error('ContextMenuRoot')],
		},
		{
			name: 'multiple named context menu imports',
			code: "import { ContextMenuRoot, ContextMenuContent, ContextMenuItem } from 'reka-ui';",
			errors: [error('ContextMenuRoot'), error('ContextMenuContent'), error('ContextMenuItem')],
		},
		{
			name: 'mixed context menu and other specifiers — only context menu is flagged',
			code: "import { DialogRoot, ContextMenuRoot, SelectRoot } from 'reka-ui';",
			errors: [error('ContextMenuRoot')],
		},
		{
			name: 'named re-export',
			code: "export { ContextMenuRoot } from 'reka-ui';",
			errors: [error('ContextMenuRoot')],
		},
		{
			name: 'aliased re-export — flagged by the source-module name',
			code: "export { ContextMenuRoot as Root } from 'reka-ui';",
			errors: [error('ContextMenuRoot')],
		},
		{
			name: 'type-only context menu import',
			code: "import type { ContextMenuRootProps } from 'reka-ui';",
			errors: [error('ContextMenuRootProps')],
		},
		{
			name: 'context menu import outside the wrapper, even under a context menu folder',
			code: "import { ContextMenuRoot } from 'reka-ui';",
			filename: '/repo/packages/frontend/editor-ui/src/features/shared/contextMenu/ContextMenu.vue',
			errors: [error('ContextMenuRoot')],
		},
		{
			name: 'context menu import from a sibling design-system component',
			code: "import { ContextMenuItem } from 'reka-ui';",
			filename:
				'/repo/packages/frontend/@n8n/design-system/src/components/N8nDropdownMenu/DropdownMenu.vue',
			errors: [error('ContextMenuItem')],
		},
	],
});
