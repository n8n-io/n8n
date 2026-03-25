import type {IsLowerCase, IsNumeric, IsUpperCase, WordSeparators} from './internal';

type SkipEmptyWord<Word extends string> = Word extends '' ? [] : [Word];

type RemoveLastCharacter<Sentence extends string, Character extends string> = Sentence extends `${infer LeftSide}${Character}`
	? SkipEmptyWord<LeftSide>
	: never;

/**
Split a string (almost) like Lodash's `_.words()` function.

- Split on each word that begins with a capital letter.
- Split on each {@link WordSeparators}.
- Split on numeric sequence.

@example
```
type Words0 = SplitWords<'helloWorld'>; // ['hello', 'World']
type Words1 = SplitWords<'helloWORLD'>; // ['hello', 'WORLD']
type Words2 = SplitWords<'hello-world'>; // ['hello', 'world']
type Words3 = SplitWords<'--hello the_world'>; // ['hello', 'the', 'world']
type Words4 = SplitWords<'lifeIs42'>; // ['life', 'Is', '42']
```

@internal
@category Change case
@category Template literal
*/
export type SplitWords<
	Sentence extends string,
	LastCharacter extends string = '',
	CurrentWord extends string = '',
> = Sentence extends `${infer FirstCharacter}${infer RemainingCharacters}`
	? FirstCharacter extends WordSeparators
		// Skip word separator
		? [...SkipEmptyWord<CurrentWord>, ...SplitWords<RemainingCharacters>]
		: LastCharacter extends ''
			// Fist char of word
			? SplitWords<RemainingCharacters, FirstCharacter, FirstCharacter>
			// Case change: non-numeric to numeric, push word
			: [false, true] extends [IsNumeric<LastCharacter>, IsNumeric<FirstCharacter>]
				? [...SkipEmptyWord<CurrentWord>, ...SplitWords<RemainingCharacters, FirstCharacter, FirstCharacter>]
				// Case change: numeric to non-numeric, push word
				: [true, false] extends [IsNumeric<LastCharacter>, IsNumeric<FirstCharacter>]
					? [...SkipEmptyWord<CurrentWord>, ...SplitWords<RemainingCharacters, FirstCharacter, FirstCharacter>]
					// No case change: concat word
					: [true, true] extends [IsNumeric<LastCharacter>, IsNumeric<FirstCharacter>]
						? SplitWords<RemainingCharacters, FirstCharacter, `${CurrentWord}${FirstCharacter}`>
					// Case change: lower to upper, push word
						: [true, true] extends [IsLowerCase<LastCharacter>, IsUpperCase<FirstCharacter>]
							? [...SkipEmptyWord<CurrentWord>, ...SplitWords<RemainingCharacters, FirstCharacter, FirstCharacter>]
						// Case change: upper to lower, brings back the last character, push word
							: [true, true] extends [IsUpperCase<LastCharacter>, IsLowerCase<FirstCharacter>]
								? [...RemoveLastCharacter<CurrentWord, LastCharacter>, ...SplitWords<RemainingCharacters, FirstCharacter, `${LastCharacter}${FirstCharacter}`>]
							// No case change: concat word
								: SplitWords<RemainingCharacters, FirstCharacter, `${CurrentWord}${FirstCharacter}`>
	: [...SkipEmptyWord<CurrentWord>];
