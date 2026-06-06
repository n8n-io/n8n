import {
	KNOWLEDGE_CSV_RUNNER_PATH,
	getKnowledgeCsvRunnerAssetPath,
} from '../agent-knowledge-sandbox-runtime';

/** Map baked sandbox runner path to the local repo asset for unit tests. */
export function resolveKnowledgeCsvRunnerArgs(args: string[]): string[] {
	return args.map((arg) =>
		arg === KNOWLEDGE_CSV_RUNNER_PATH ? getKnowledgeCsvRunnerAssetPath() : arg,
	);
}
