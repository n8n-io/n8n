/**
 * Opus-optimized Prompts for AI Workflow Builder
 *
 * These prompts are designed for Claude Opus 4.5 which requires
 * significantly less context than Sonnet to produce high-quality results.
 *
 * Key reductions:
 * - Supervisor: 55 → 25 lines (~55% reduction)
 * - Discovery: 440 → 80 lines (~82% reduction)
 * - Builder: 748 → 150 lines (~80% reduction) - now includes configuration
 * - Responder: 89 → 45 lines (~49% reduction)
 * - Parameter Updater: 1,571 → 115 lines (~93% reduction)
 *
 * Total: ~3,538 → ~415 lines (~88% reduction)
 */

// Agent prompts
export * from './agents';

// Parameter updater
export {
	CORE_INSTRUCTIONS,
	COMMON_PATTERNS,
	instanceUrlPrompt,
	buildParameterUpdaterPrompt,
} from './parameter-updater.prompt';
