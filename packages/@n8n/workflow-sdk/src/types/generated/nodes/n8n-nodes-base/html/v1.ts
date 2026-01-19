/**
 * HTML Node - Version 1
 * Work with HTML
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface HtmlV1Config {
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
	extractionValues?: {
		values?: Array<{
			/** The key under which the extracted value should be saved
			 */
			key?: string | Expression<string>;
			/** The CSS selector to use
			 */
			cssSelector?: string | Expression<string>;
			/** What kind of data should be returned
			 * @default text
			 */
			returnValue?: 'attribute' | 'html' | 'text' | 'value' | Expression<string>;
			/** The name of the attribute to return the value off
			 * @displayOptions.show { returnValue: ["attribute"] }
			 */
			attribute?: string | Expression<string>;
			/** Comma-separated list of selectors to skip in the text extraction
			 * @displayOptions.show { returnValue: ["text"] }
			 */
			skipSelectors?: string | Expression<string>;
			/** Whether to return the values as an array so if multiple ones get found they also get returned separately. If not set all will be returned as a single string.
			 * @default false
			 */
			returnArray?: boolean | Expression<boolean>;
		}>;
	};
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface HtmlV1NodeBase {
	type: 'n8n-nodes-base.html';
	version: 1;
}

export type HtmlV1Node = HtmlV1NodeBase & {
	config: NodeConfig<HtmlV1Config>;
};

export type HtmlV1Node = HtmlV1Node;