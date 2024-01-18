import { addVarType } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { defineComponent } from 'vue';

const escape = (str: string) => str.replace('$', '\\$');

export const secretsCompletions = defineComponent({
	methods: {
		/**
		 * Complete `$secrets.` to `$secrets.providerName` and `$secrets.providerName.secretName`.
		 */
		secretsCompletions(context: CompletionContext, matcher = '$secrets'): CompletionResult | null {
			const pattern = new RegExp(`${escape(matcher)}\..*`);
			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const provider = preCursor.text.split('.')[1];
			const externalSecretsStore = useExternalSecretsStore();
			let options: Completion[];

			const optionsForObject = (leftSide: string, object: object): Completion[] => {
				return Object.entries(object).flatMap(([key, value]) => {
					if (typeof value === 'object' && value !== null) {
						return optionsForObject(`${leftSide}.${key}`, value);
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
					externalSecretsStore.secretsAsObject[provider],
				);
			} else {
				options = Object.keys(externalSecretsStore.secretsAsObject).map((provider) => ({
					label: `${matcher}.${provider}`,
					info: JSON.stringify(externalSecretsStore.secretsAsObject[provider]),
				}));
			}

			return {
				from: preCursor.from,
				options: options.map(addVarType),
			};
		},
	},
});
