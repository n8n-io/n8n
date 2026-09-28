import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { matchBeforeCursor } from './utils';

const createContext = (doc: string, explicit = false) =>
	new CompletionContext(EditorState.create({ doc }), doc.length, explicit);

describe('matchBeforeCursor', () => {
	it('returns null when the pattern does not match', () => {
		expect(matchBeforeCursor(createContext('item'), /\d+/)).toBeNull();
	});

	it('returns null for an empty implicit match', () => {
		expect(matchBeforeCursor(createContext(''), /\w*/)).toBeNull();
	});

	it('returns an empty explicit match', () => {
		expect(matchBeforeCursor(createContext('', true), /\w*/)).toEqual({
			from: 0,
			to: 0,
			text: '',
		});
	});

	it('returns a non-empty implicit match', () => {
		expect(matchBeforeCursor(createContext('item'), /i\w*/)).toEqual({
			from: 0,
			to: 4,
			text: 'item',
		});
	});
});
