import { addVarType } from '@/features/environments.ee/completions/variables.completions';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useExternalSecretsStore } from '@/features/externalSecrets/externalSecrets.ee.store';

const escape = (str: string) => str.replace('$', '\\$');

export function useSecretsCompletions() {
	const externalSecretsStore = useExternalSecretsStore();

	/**
	 * Complete `$secrets.` to `$secrets.providerName` and `$secrets.providerName.secretName`.
	 */
	const secretsCompletions = (
		context: CompletionContext,
		matcher = '$secrets',
	): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);
		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const provider = preCursor.text.split('.')[1];
		let options: Completion[];

		const optionsForObject = (leftSide: string, object: Record<string, unknown>): Completion[] => {
			return Object.entries(object).flatMap(([key, value]) => {
				if (typeof value === 'object' && value !== null) {
					return optionsForObject(`${leftSide}.${key}`, value as Record<string, unknown>);
				}
				return {
					label: `${leftSide}.${key}`,
					info: '*******',
				};
			});
		};

		if (provider) {
			options = optionsForObject(
				`${matcher}.${provider}`,
				externalSecretsStore.secretsAsObject[provider] as Record<string, unknown>,
			);
		} else {
			options = Object.keys(externalSecretsStore.secretsAsObject).map((providerB) => ({
				label: `${matcher}.${providerB}`,
				info: JSON.stringify(externalSecretsStore.secretsAsObject[providerB]),
			}));
		}

		return {
			from: preCursor.from,
			options: options.map(addVarType),
		};
	};

	return {
		secretsCompletions,
	};
}
