/**
 * HTML Node - Version 1.1
 * Work with HTML
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface HtmlV11Config {
	operation?: 'generateHtmlTemplate' | 'extractHtmlContent' | 'convertToHtmlTable' | Expression<string>;
/**
 * HTML template to render
 * @displayOptions.show { operation: ["generateHtmlTemplate"] }
 * @default <!DOCTYPE html>

<html>
<head>
  <meta charset="UTF-8" />
  <title>My HTML document</title>
</head>
<body>
  <div class="container">
    <h1>This is an H1 heading</h1>
    <h2>This is an H2 heading</h2>
    <p>This is a paragraph</p>
  </div>
</body>
</html>

<style>
.container {
  background-color: #ffffff;
  text-align: center;
  padding: 16px;
  border-radius: 8px;
}

h1 {
  color: #ff6d5a;
  font-size: 24px;
  font-weight: bold;
  padding: 8px;
}

h2 {
  color: #909399;
  font-size: 18px;
  font-weight: bold;
  padding: 8px;
}
</style>

<script>
console.log("Hello World!");
</script>
 */
		html?: string | Expression<string>;
/**
 * If HTML should be read from binary or JSON data
 * @displayOptions.show { operation: ["extractHtmlContent"] }
 * @default json
 */
		sourceData?: 'binary' | 'json' | Expression<string>;
	dataPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface HtmlV11NodeBase {
	type: 'n8n-nodes-base.html';
	version: 1.1;
}

export type HtmlV11Node = HtmlV11NodeBase & {
	config: NodeConfig<HtmlV11Config>;
};

export type HtmlV11Node = HtmlV11Node;