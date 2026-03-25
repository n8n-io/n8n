import { ArgumentArray } from './index.js';

declare namespace classNames {
	type Binding = Record<string, string>;
}

interface ClassNames {
	(this: classNames.Binding | undefined, ...args: ArgumentArray): string;

	default: ClassNames;
}

declare const classNames: ClassNames;

export as namespace classNames;

export = classNames;
