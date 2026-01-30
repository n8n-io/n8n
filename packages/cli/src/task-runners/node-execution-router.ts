import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

/**
 * Determines whether a node should be executed in the sandboxed node runner
 * or in the main n8n process.
 *
 * Default behavior:
 * - Built-in nodes (n8n-nodes-base, @n8n/n8n-nodes-langchain): Run in main process
 * - Community nodes: Run in node runner (sandboxed)
 * - Custom nodes (N8N_CUSTOM_EXTENSIONS): Run in node runner (sandboxed)
 *
 * Configuration can override this behavior via environment variables.
 */
@Service()
export class NodeExecutionRouter {
	private readonly logger: Logger;

	/** Built-in packages that run in main process by default */
	private readonly builtinPackages = new Set([
		'n8n-nodes-base',
		'@n8n/n8n-nodes-langchain',
	]);

	/** Parsed list of built-in nodes to force into sandbox */
	private readonly sandboxBuiltinPatterns: string[];

	/** Parsed list of community nodes to allow in main process */
	private readonly unsandboxCommunityPatterns: string[];

	constructor(
		logger: Logger,
		private readonly config: TaskRunnersConfig,
	) {
		this.logger = logger.scoped('node-execution-router');
		this.sandboxBuiltinPatterns = this.parsePatternList(config.nodeRunnerSandboxBuiltin);
		this.unsandboxCommunityPatterns = this.parsePatternList(config.nodeRunnerUnsandboxCommunity);

		this.logger.debug('NodeExecutionRouter initialized', {
			nodeRunnerEnabled: config.nodeRunnerEnabled,
			sandboxAll: config.nodeRunnerSandboxAll,
			sandboxBuiltinPatterns: this.sandboxBuiltinPatterns,
			unsandboxCommunityPatterns: this.unsandboxCommunityPatterns,
		});
	}

	/**
	 * Determines if a node should be executed in the sandboxed runner.
	 */
	shouldRunInSandbox(node: INode): boolean {
		// If node runner is disabled, never sandbox
		if (!this.config.nodeRunnerEnabled) {
			this.logger.debug('Node runner disabled, running in main process', {
				nodeType: node.type,
				nodeName: node.name,
			});
			return false;
		}

		// Override: sandbox everything
		if (this.config.nodeRunnerSandboxAll) {
			this.logger.debug('Sandbox all enabled, running in sandbox', {
				nodeType: node.type,
				nodeName: node.name,
			});
			return true;
		}

		const nodePackage = this.getNodePackage(node.type);

		// Built-in nodes: run in main process by default
		if (this.isBuiltinPackage(nodePackage)) {
			// Unless explicitly listed in sandbox list
			const shouldSandbox = this.matchesAnyPattern(node.type, this.sandboxBuiltinPatterns);
			this.logger.debug('Built-in node routing decision', {
				nodeType: node.type,
				nodeName: node.name,
				nodePackage,
				shouldSandbox,
				reason: shouldSandbox ? 'matches sandbox pattern' : 'built-in default',
			});
			return shouldSandbox;
		}

		// Community/custom nodes: run in sandbox by default
		// Unless explicitly listed in unsandbox list
		const shouldSandbox = !this.matchesAnyPattern(node.type, this.unsandboxCommunityPatterns);
		this.logger.debug('Community/custom node routing decision', {
			nodeType: node.type,
			nodeName: node.name,
			nodePackage,
			shouldSandbox,
			reason: shouldSandbox ? 'community node default' : 'matches unsandbox pattern',
		});
		return shouldSandbox;
	}

	/**
	 * Checks if a package is a built-in n8n package.
	 */
	private isBuiltinPackage(packageName: string): boolean {
		return this.builtinPackages.has(packageName);
	}

	/**
	 * Extracts the package name from a node type.
	 * @example "n8n-nodes-base.slack" -> "n8n-nodes-base"
	 * @example "@n8n/n8n-nodes-langchain.agent" -> "@n8n/n8n-nodes-langchain"
	 */
	private getNodePackage(nodeType: string): string {
		// Handle scoped packages like @n8n/n8n-nodes-langchain.agent
		if (nodeType.startsWith('@')) {
			const parts = nodeType.split('.');
			// First part includes scope and package: "@n8n/n8n-nodes-langchain"
			return parts[0];
		}

		// Regular packages: "n8n-nodes-base.slack"
		const dotIndex = nodeType.indexOf('.');
		return dotIndex > 0 ? nodeType.slice(0, dotIndex) : nodeType;
	}

	/**
	 * Parses a comma-separated list of patterns into an array.
	 */
	private parsePatternList(patternString: string): string[] {
		if (!patternString) return [];
		return patternString
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
	}

	/**
	 * Checks if a node type matches any of the given patterns.
	 * Supports wildcard patterns like "some-package.*"
	 */
	private matchesAnyPattern(nodeType: string, patterns: string[]): boolean {
		return patterns.some((pattern) => this.matchesPattern(nodeType, pattern));
	}

	/**
	 * Checks if a node type matches a single pattern.
	 * @example matchesPattern("n8n-nodes-base.slack", "n8n-nodes-base.*") -> true
	 * @example matchesPattern("n8n-nodes-base.slack", "n8n-nodes-base.slack") -> true
	 */
	private matchesPattern(nodeType: string, pattern: string): boolean {
		if (pattern.endsWith('.*')) {
			// Package wildcard: "some-package.*" matches "some-package.anything"
			const prefix = pattern.slice(0, -1); // Remove the '*', keep the '.'
			return nodeType.startsWith(prefix);
		}
		return nodeType === pattern;
	}
}
