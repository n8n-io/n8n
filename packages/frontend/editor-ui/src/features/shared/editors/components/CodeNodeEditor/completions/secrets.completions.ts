import { addVarType } from '@/features/settings/environments.ee/completions/variables.completions';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';

const escape = (str: string) => str.replace('$', '\\$');

// NOTE: this file is unused, only externalSecrets.ee.store.ts#secretsAsObject is the source for expressions
// and datatype.completions.ts renders them in the little popup in the expression editor
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

		const optionGroup1Label = 'Global';
		const optionsGroup1 = options
			.map((option) => ({
				...option,
				section: optionGroup1Label,
			}))
			.map(addVarType);

		// TODO: include mock project secrets here
		const optionGroup2Label = 'Veggies';
		const optionsGroup2 = [
			{
				label: 'Potatoe',
				info: 'healthy veggie',
				section: optionGroup2Label,
			},
		];

		return {
			from: preCursor.from,
			options: [...optionsGroup1, ...optionsGroup2],
		};
	};

	return {
		secretsCompletions,
	};
}
