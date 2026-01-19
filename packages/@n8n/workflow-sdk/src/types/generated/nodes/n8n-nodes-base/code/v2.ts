/**
 * Code Node - Version 2
 * Run custom JavaScript or Python code
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Run this code only once, no matter how many input items there are */
export type CodeV2RunOnceForAllItemsConfig = {
	mode: 'runOnceForAllItems';
	language?: 'javaScript' | 'pythonNative' | Expression<string>;
/**
 * JavaScript code to execute.&lt;br&gt;&lt;br&gt;Tip: You can use luxon vars like &lt;code&gt;$today&lt;/code&gt; for dates and &lt;code&gt;$jmespath&lt;/code&gt; for querying JSON structures. &lt;a href="https://docs.n8n.io/nodes/n8n-nodes-base.function"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.show { language: ["javaScript"], mode: ["runOnceForAllItems"] }
 */
		jsCode?: string | Expression<string>;
/**
 * Python code to execute.&lt;br&gt;&lt;br&gt;Tip: You can use built-in methods and variables like &lt;code&gt;_today&lt;/code&gt; for dates and &lt;code&gt;_jmespath&lt;/code&gt; for querying JSON structures. &lt;a href="https://docs.n8n.io/code/builtin/"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.show { language: ["pythonNative"], mode: ["runOnceForAllItems"] }
 */
		pythonCode?: string | Expression<string>;
};

/** Run this code as many times as there are input items */
export type CodeV2RunOnceForEachItemConfig = {
	mode: 'runOnceForEachItem';
	language?: 'javaScript' | 'pythonNative' | Expression<string>;
/**
 * JavaScript code to execute.&lt;br&gt;&lt;br&gt;Tip: You can use luxon vars like &lt;code&gt;$today&lt;/code&gt; for dates and &lt;code&gt;$jmespath&lt;/code&gt; for querying JSON structures. &lt;a href="https://docs.n8n.io/nodes/n8n-nodes-base.function"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.show { language: ["javaScript"], mode: ["runOnceForEachItem"] }
 */
		jsCode?: string | Expression<string>;
/**
 * Python code to execute.&lt;br&gt;&lt;br&gt;Tip: You can use built-in methods and variables like &lt;code&gt;_today&lt;/code&gt; for dates and &lt;code&gt;_jmespath&lt;/code&gt; for querying JSON structures. &lt;a href="https://docs.n8n.io/code/builtin/"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.show { language: ["pythonNative"], mode: ["runOnceForEachItem"] }
 */
		pythonCode?: string | Expression<string>;
};

export type CodeV2Params =
	| CodeV2RunOnceForAllItemsConfig
	| CodeV2RunOnceForEachItemConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface CodeV2NodeBase {
	type: 'n8n-nodes-base.code';
	version: 2;
}

export type CodeV2RunOnceForAllItemsNode = CodeV2NodeBase & {
	config: NodeConfig<CodeV2RunOnceForAllItemsConfig>;
};

export type CodeV2RunOnceForEachItemNode = CodeV2NodeBase & {
	config: NodeConfig<CodeV2RunOnceForEachItemConfig>;
};

export type CodeV2Node =
	| CodeV2RunOnceForAllItemsNode
	| CodeV2RunOnceForEachItemNode
	;