import { ifIn } from '@codemirror/autocomplete';
import { blankCompletions } from './blank.completions';
import { bracketAccessCompletions } from './bracketAccess.completions';
import { datatypeCompletions } from './datatype.completions';
import { dollarCompletions } from './dollar.completions';
import { nonDollarCompletions } from './nonDollar.completions';

export function n8nCompletionSources() {
	return [
		blankCompletions,
		bracketAccessCompletions,
		datatypeCompletions,
		dollarCompletions,
		nonDollarCompletions,
	].map((source) => ({
		autocomplete: ifIn(['Resolvable'], source),
	}));
}
