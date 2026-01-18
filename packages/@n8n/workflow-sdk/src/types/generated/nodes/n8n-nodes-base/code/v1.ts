/**
 * Code Node - Version 1
 * Run custom JavaScript or Python code
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Run this code only once, no matter how many input items there are */
export type CodeV1RunOnceForAllItemsConfig = {
	mode: 'runOnceForAllItems';
	language?: unknown;
/**
 * JavaScript code to execute.&lt;br&gt;&lt;br&gt;Tip: You can use luxon vars like &lt;code&gt;$today&lt;/code&gt; for dates and &lt;code&gt;$jmespath&lt;/code&gt; for querying JSON structures. &lt;a href="https://docs.n8n.io/nodes/n8n-nodes-base.function"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.show { mode: ["runOnceForAllItems"] }
 */
		jsCode?: string | Expression<string>;
/**
 * Python code to execute.&lt;br&gt;&lt;br&gt;Tip: You can use built-in methods and variables like &lt;code&gt;_today&lt;/code&gt; for dates and &lt;code&gt;_jmespath&lt;/code&gt; for querying JSON structures. &lt;a href="https://docs.n8n.io/code/builtin/"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.show { language: ["pythonNative"], mode: ["runOnceForAllItems"] }
 */
		pythonCode?: string | Expression<string>;
};

/** Run this code as many times as there are input items */
export type CodeV1RunOnceForEachItemConfig = {
	mode: 'runOnceForEachItem';
	language?: unknown;
/**
 * JavaScript code to execute.&lt;br&gt;&lt;br&gt;Tip: You can use luxon vars like &lt;code&gt;$today&lt;/code&gt; for dates and &lt;code&gt;$jmespath&lt;/code&gt; for querying JSON structures. &lt;a href="https://docs.n8n.io/nodes/n8n-nodes-base.function"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.show { mode: ["runOnceForEachItem"] }
 */
		jsCode?: string | Expression<string>;
/**
 * Python code to execute.&lt;br&gt;&lt;br&gt;Tip: You can use built-in methods and variables like &lt;code&gt;_today&lt;/code&gt; for dates and &lt;code&gt;_jmespath&lt;/code&gt; for querying JSON structures. &lt;a href="https://docs.n8n.io/code/builtin/"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.show { language: ["pythonNative"], mode: ["runOnceForEachItem"] }
 */
		pythonCode?: string | Expression<string>;
};

export type CodeV1Params =
	| CodeV1RunOnceForAllItemsConfig
	| CodeV1RunOnceForEachItemConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type CodeV1Node = {
	type: 'n8n-nodes-base.code';
	version: 1;
	config: NodeConfig<CodeV1Params>;
	credentials?: Record<string, never>;
};