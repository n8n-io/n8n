import { escape } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { createInfoBoxRenderer } from '@/plugins/codemirror/completions/infoBoxRenderer';
import { luxonStaticDocs } from '@/plugins/codemirror/completions/nativesAutocompleteDocs/luxon.static.docs';
import { luxonInstanceDocs } from '@/plugins/codemirror/completions/nativesAutocompleteDocs/luxon.instance.docs';

export function useLuxonCompletions() {
	/**
	 * Complete `$today.` with luxon `DateTime` instance methods.
	 */
	const todayCompletions = (
		context: CompletionContext,
		matcher = '$today',
	): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		return {
			from: preCursor.from,
			options: instanceCompletions(matcher),
		};
	};

	/**
	 * Complete `$now.` with luxon `DateTime` instance methods.
	 */
	const nowCompletions = (
		context: CompletionContext,
		matcher = '$now',
	): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		return {
			from: preCursor.from,
			options: instanceCompletions(matcher),
		};
	};

	/**
	 * Complete `DateTime` with luxon `DateTime` static methods.
	 */
	const dateTimeCompletions = (
		context: CompletionContext,
		matcher = 'DateTime',
	): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const options: Completion[] = Object.entries(luxonStaticDocs.functions)
			.filter(([_, { doc }]) => doc && !doc.hidden)
			.map(([method, { doc }]) => {
				return {
					label: `DateTime.${method}()`,
					type: 'function',
					info: createInfoBoxRenderer(doc, true),
				};
			});

		return {
			from: preCursor.from,
			options,
		};
	};

	const instanceCompletions = (matcher: string): Completion[] => {
		return Object.entries(luxonInstanceDocs.properties)
			.filter(([_, { doc }]) => doc && !doc.hidden)
			.map(([getter, { doc }]) => {
				return {
					label: `${matcher}.${getter}`,
					info: createInfoBoxRenderer(doc),
				};
			})
			.concat(
				Object.entries(luxonInstanceDocs.functions)
					.filter(([_, { doc }]) => doc && !doc.hidden)
					.map(([method, { doc }]) => {
						return {
							label: `${matcher}.${method}()`,
							info: createInfoBoxRenderer(doc, true),
						};
					}),
			);
	};

	return {
		todayCompletions,
		nowCompletions,
		dateTimeCompletions,
	};
}
