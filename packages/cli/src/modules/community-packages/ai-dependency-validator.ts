/**
 * AI Dependency Validator for Community Packages
 *
 * Validates that community AI nodes use n8n's abstraction layer instead
 * of directly depending on LangChain or other AI frameworks.
 */

import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { UserError } from 'n8n-workflow';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface PackageJson {
	name: string;
	version: string;
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

/**
 * List of LangChain packages that should not be used directly
 */
const BLOCKED_LANGCHAIN_DEPS = new Set([
	'@langchain/core',
	'@langchain/community',
	'langchain',
	'@langchain/classic',
	'@langchain/anthropic',
	'@langchain/openai',
	'@langchain/aws',
	'@langchain/cohere',
	'@langchain/google-genai',
	'@langchain/google-vertexai',
	'@langchain/groq',
	'@langchain/mistralai',
	'@langchain/ollama',
	'@langchain/pinecone',
	'@langchain/qdrant',
	'@langchain/redis',
	'@langchain/weaviate',
	'@langchain/mongodb',
	'@langchain/textsplitters',
]);

/**
 * Required peer dependencies for AI nodes
 */
const REQUIRED_PEER_DEPS = ['n8n-workflow'];

@Service()
export class AiDependencyValidator {
	constructor(private readonly logger: Logger) {}

	/**
	 * Validate a community package for AI-related dependency issues
	 * @param packagePath - Path to the package directory
	 * @throws {UserError} if validation fails
	 */
	async validatePackage(packagePath: string): Promise<void> {
		const packageJson = await this.readPackageJson(packagePath);

		// Check if package contains AI nodes by looking for AI-related keywords
		const isAiPackage = this.isAiRelatedPackage(packageJson);

		if (!isAiPackage) {
			this.logger.debug(`Package ${packageJson.name} is not AI-related, skipping validation`);
			return;
		}

		this.logger.info(`Validating AI dependencies for package: ${packageJson.name}`);

		const violations: string[] = [];

		// Check for blocked LangChain dependencies
		const blockedDeps = this.findBlockedDependencies(packageJson);
		if (blockedDeps.length > 0) {
			violations.push(
				...blockedDeps.map(
					(dep) =>
						`Dependency "${dep}" is not allowed. ` +
						`Use n8n's AI interfaces from 'n8n-workflow' instead.\n` +
						`  See: https://docs.n8n.io/integrations/creating-nodes/build/ai-nodes/`,
				),
			);
		}

		// Check for required peer dependencies
		const missingPeerDeps = this.findMissingPeerDependencies(packageJson);
		if (missingPeerDeps.length > 0) {
			violations.push(
				...missingPeerDeps.map(
					(dep) =>
						`Missing required peerDependency: "${dep}". ` +
						`Add it to peerDependencies in package.json.`,
				),
			);
		}

		// Generate recommendations
		const recommendations = this.generateRecommendations(packageJson);

		if (violations.length > 0) {
			const errorMessage = [
				`AI package validation failed for ${packageJson.name}:`,
				'',
				'Violations:',
				...violations.map((v) => `  ❌ ${v}`),
			];

			if (recommendations.length > 0) {
				errorMessage.push('', 'Recommendations:', ...recommendations.map((r) => `  💡 ${r}`));
			}

			errorMessage.push(
				'',
				'Community AI nodes should implement n8n AI interfaces (IN8nChatModel,',
				'IN8nEmbeddings, IN8nVectorStore, IN8nTool) and use native AI SDKs',
				'(like @anthropic-ai/sdk, openai, etc.) instead of LangChain.',
			);

			throw new UserError(errorMessage.join('\n'), {
				level: 'warning',
				description:
					'This ensures your node works with future n8n versions and reduces bundle size.',
			});
		}

		if (recommendations.length > 0) {
			this.logger.warn(`Recommendations for ${packageJson.name}:`, {
				recommendations,
			});
		}
	}

	/**
	 * Read and parse package.json
	 */
	private async readPackageJson(packagePath: string): Promise<PackageJson> {
		const packageJsonPath = join(packagePath, 'package.json');
		const content = await readFile(packageJsonPath, 'utf-8');
		return JSON.parse(content) as PackageJson;
	}

	/**
	 * Check if package is AI-related by inspecting name and dependencies
	 */
	private isAiRelatedPackage(packageJson: PackageJson): boolean {
		const name = packageJson.name.toLowerCase();

		// Check package name for AI-related keywords
		const aiKeywords = ['ai', 'llm', 'langchain', 'chat', 'agent', 'embedding', 'vector'];
		const hasAiKeyword = aiKeywords.some((keyword) => name.includes(keyword));

		// Check if it has any AI-related dependencies
		const allDeps = {
			...packageJson.dependencies,
			...packageJson.peerDependencies,
			...packageJson.devDependencies,
		};

		const hasAiDeps = Object.keys(allDeps).some((dep) => {
			const depLower = dep.toLowerCase();
			return (
				aiKeywords.some((keyword) => depLower.includes(keyword)) ||
				dep.startsWith('@anthropic-ai/') ||
				dep === 'openai' ||
				dep === 'cohere-ai' ||
				BLOCKED_LANGCHAIN_DEPS.has(dep)
			);
		});

		return hasAiKeyword || hasAiDeps;
	}

	/**
	 * Find blocked dependencies in package.json
	 */
	private findBlockedDependencies(packageJson: PackageJson): string[] {
		const allDeps = {
			...packageJson.dependencies,
			...packageJson.peerDependencies,
		};

		return Object.keys(allDeps).filter((dep) => BLOCKED_LANGCHAIN_DEPS.has(dep));
	}

	/**
	 * Find missing required peer dependencies
	 */
	private findMissingPeerDependencies(packageJson: PackageJson): string[] {
		const peerDeps = packageJson.peerDependencies || {};
		const missing: string[] = [];

		for (const required of REQUIRED_PEER_DEPS) {
			if (!(required in peerDeps)) {
				missing.push(required);
			}
		}

		return missing;
	}

	/**
	 * Generate recommendations for the package
	 */
	private generateRecommendations(packageJson: PackageJson): string[] {
		const recommendations: string[] = [];
		const deps = packageJson.dependencies || {};

		// Suggest using native SDKs
		const aiSdks = {
			openai: '@anthropic-ai/sdk for Anthropic Claude',
			'@anthropic-ai/sdk': 'openai for OpenAI GPT',
			'cohere-ai': 'Cohere SDK for Cohere models',
		};

		for (const [sdk, alternative] of Object.entries(aiSdks)) {
			if (sdk in deps) {
				recommendations.push(`Consider also supporting ${alternative} for more flexibility`);
			}
		}

		// Check if n8n-workflow is in peerDependencies
		const peerDeps = packageJson.peerDependencies || {};
		if (!('n8n-workflow' in peerDeps)) {
			recommendations.push('Add "n8n-workflow" to peerDependencies to use n8n AI interfaces');
		}

		return recommendations;
	}

	/**
	 * Generate a migration guide for packages using LangChain
	 */
	generateMigrationGuide(packageJson: PackageJson): string {
		const blockedDeps = this.findBlockedDependencies(packageJson);

		if (blockedDeps.length === 0) {
			return 'No migration needed - package is already using n8n interfaces!';
		}

		return [
			'Migration Guide: LangChain → n8n AI Interfaces',
			'',
			'1. Remove LangChain dependencies:',
			'   npm uninstall ' + blockedDeps.join(' '),
			'',
			'2. Add n8n-workflow as peer dependency:',
			'   In package.json:',
			'   "peerDependencies": {',
			'     "n8n-workflow": "workspace:*"',
			'   }',
			'',
			'3. Install native AI SDK (e.g., for Anthropic):',
			'   npm install @anthropic-ai/sdk',
			'',
			'4. Update your code:',
			'   Before:',
			'     import { ChatAnthropic } from "@langchain/anthropic";',
			'',
			'   After:',
			'     import Anthropic from "@anthropic-ai/sdk";',
			'     import type { IN8nChatModel, IN8nAiMessage } from "n8n-workflow";',
			'     import { N8nAiMessageRole } from "n8n-workflow";',
			'',
			'     class AnthropicChatModel implements IN8nChatModel {',
			'       async invoke(messages: IN8nAiMessage[]): Promise<IN8nAiMessage> {',
			'         // Use Anthropic SDK directly',
			'       }',
			'     }',
			'',
			'5. Test your node and verify it works with n8n agents and chains',
			'',
			'Benefits:',
			'  • Smaller bundle size (~50MB reduction)',
			'  • No version conflicts with n8n',
			'  • Future-proof against framework changes',
			'  • Direct SDK access = more features',
		].join('\n');
	}
}
