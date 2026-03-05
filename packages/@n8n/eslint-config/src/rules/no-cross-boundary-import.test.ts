import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoCrossBoundaryImportRule } from './no-cross-boundary-import.js';

const ruleTester = new RuleTester();

ruleTester.run('no-cross-boundary-import', NoCrossBoundaryImportRule, {
	valid: [
		// workflow importing from allowed packages
		{
			code: 'import { something } from "lodash"',
			filename: '/repo/packages/workflow/src/utils.ts',
		},
		// core importing from workflow (allowed)
		{
			code: 'import { INode } from "n8n-workflow"',
			filename: '/repo/packages/core/src/engine.ts',
		},
		// editor-ui importing from workflow (allowed)
		{
			code: 'import { INode } from "n8n-workflow"',
			filename: '/repo/packages/frontend/editor-ui/src/App.ts',
		},
		// editor-ui importing from api-types (allowed)
		{
			code: 'import type { User } from "@n8n/api-types"',
			filename: '/repo/packages/frontend/editor-ui/src/App.ts',
		},
		// design-system importing from external packages (allowed)
		{
			code: 'import { ref } from "vue"',
			filename: '/repo/packages/frontend/@n8n/design-system/src/Button.ts',
		},
		// file outside any tracked package (no rule applies)
		{
			code: 'import { anything } from "n8n-core"',
			filename: '/repo/packages/other/src/index.ts',
		},
	],

	invalid: [
		// workflow importing from core (forbidden)
		{
			code: 'import { Engine } from "n8n-core"',
			filename: '/repo/packages/workflow/src/utils.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// workflow importing from editor-ui (forbidden)
		{
			code: 'import { store } from "n8n-editor-ui"',
			filename: '/repo/packages/workflow/src/utils.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// core importing from editor-ui (forbidden)
		{
			code: 'import { View } from "n8n-editor-ui"',
			filename: '/repo/packages/core/src/engine.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// editor-ui importing from n8n-core (forbidden)
		{
			code: 'import { Engine } from "n8n-core"',
			filename: '/repo/packages/frontend/editor-ui/src/App.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// editor-ui importing from nodes-base (forbidden)
		{
			code: 'import { helper } from "n8n-nodes-base"',
			filename: '/repo/packages/frontend/editor-ui/src/App.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// design-system importing from editor-ui (forbidden)
		{
			code: 'import { Component } from "n8n-editor-ui"',
			filename: '/repo/packages/frontend/@n8n/design-system/src/Button.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// design-system importing from n8n-core (forbidden)
		{
			code: 'import { Engine } from "n8n-core"',
			filename: '/repo/packages/frontend/@n8n/design-system/src/Button.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// nodes-base importing from editor-ui (forbidden)
		{
			code: 'import { view } from "n8n-editor-ui"',
			filename: '/repo/packages/nodes-base/nodes/Slack/Slack.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// nodes-base importing from n8n-core (forbidden)
		{
			code: 'import { Engine } from "n8n-core"',
			filename: '/repo/packages/nodes-base/nodes/Slack/Slack.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// dynamic import also caught
		{
			code: 'const mod = await import("n8n-core")',
			filename: '/repo/packages/workflow/src/utils.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
		// scoped package sub-path also caught
		{
			code: 'import { x } from "@n8n/design-system/components"',
			filename: '/repo/packages/core/src/engine.ts',
			errors: [{ messageId: 'forbiddenImport' }],
		},
	],
});
