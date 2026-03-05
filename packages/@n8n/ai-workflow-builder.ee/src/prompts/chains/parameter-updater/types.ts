/**
 * Types for the parameter-updater prompt registry system.
 *
 * This module defines the interfaces for registering node-type specific
 * guides and examples that are automatically matched based on patterns.
 */

import type { INodeTypeDescription } from 'n8n-workflow';

/**
 * Pattern for matching node types. Supports:
 * - Exact match: 'n8n-nodes-base.set'
 * - Suffix wildcard: '*Tool' matches 'gmailTool', 'slackTool'
 * - Prefix wildcard: 'n8n-nodes-base.*' matches any n8n-nodes-base node
 * - Substring match: '.set' matches 'n8n-nodes-base.set'
 */
export type NodeTypePattern = string;

/**
 * Context passed to conditional guides/examples for matching decisions.
 */
export interface PromptContext {
	/** The node type string (e.g., 'n8n-nodes-base.set') */
	nodeType: string;
	/** The full node type definition */
	nodeDefinition: INodeTypeDescription;
	/** The requested changes from the user */
	requestedChanges: string[];
	/** Whether node has resource locator parameters */
	hasResourceLocatorParams?: boolean;
}

/**
 * A registered guide for specific node types.
 */
export interface NodeTypeGuide {
	/** Patterns to match against node type (any match triggers inclusion) */
	patterns: NodeTypePattern[];
	/** Guide content string */
	content: string;
	/**
	 * Optional condition function for more complex matching logic.
	 * If provided, guide is only included if condition returns true.
	 */
	condition?: (context: PromptContext) => boolean;
}

/**
 * Registered examples for specific node types.
 */
export interface NodeTypeExamples {
	/** Patterns to match against node type (any match triggers inclusion) */
	patterns: NodeTypePattern[];
	/** Examples content string */
	content: string;
	/**
	 * Optional condition function for more complex matching logic.
	 */
	condition?: (context: PromptContext) => boolean;
}
