// LICENSE is MIT
//
// Copyright (c) 2018
//   Dave Keen <http://www.keendevelopment.ch>
//   Adi Dahiya <https://github.com/adidahiya>
//   Jason Killian <https://github.com/JKillian>
//   Sean Kelley <https://github.com/seansfkelley>
//   Michal Adamczyk <https://github.com/mradamczyk>
//   Marvin Hagemeister <https://github.com/marvinhagemeister>

declare namespace classNames {
  type Value = string | number | boolean | undefined | null;
  type Mapping = Record<string, any>;
  interface ArgumentArray extends Array<Argument> {}
  interface ReadonlyArgumentArray extends ReadonlyArray<Argument> {}
  type Argument = Value | Mapping | ArgumentArray | ReadonlyArgumentArray;
}

interface ClassNames {
	(...args: classNames.ArgumentArray): string;

	default: ClassNames;
}

/**
 * A simple JavaScript utility for conditionally joining classNames together.
 */
declare const classNames: ClassNames;

export as namespace classNames;

export = classNames;
