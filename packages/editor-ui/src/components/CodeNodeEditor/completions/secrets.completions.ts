import Vue from 'vue';
import { addVarType } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeNodeEditorMixin } from '../types';
import { useExternalSecretsStore } from '@/stores';

const escape = (str: string) => str.replace('$', '\\$');

export const secretsCompletions = (Vue as CodeNodeEditorMixin).extend({
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
			const options: Completion[] = provider
				? Object.keys(externalSecretsStore.secretsAsObject[provider]).map((secret) => ({
						label: `${matcher}.${provider}.${secret}`,
						info: externalSecretsStore.secretsAsObject[provider][secret],
				  }))
				: Object.keys(externalSecretsStore.secretsAsObject).map((provider) => ({
						label: `${matcher}.${provider}`,
						info: JSON.stringify(externalSecretsStore.secretsAsObject[provider]),
				  }));

			return {
				from: preCursor.from,
				options: options.map(addVarType),
			};
		},
	},
});
