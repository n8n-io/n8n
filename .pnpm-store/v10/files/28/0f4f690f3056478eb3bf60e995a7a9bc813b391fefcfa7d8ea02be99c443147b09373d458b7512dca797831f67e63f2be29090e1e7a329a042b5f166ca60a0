import * as v6 from './constants';

export function groupPossibilities(possibilities: string[]): string {
  return `(${possibilities.join('|')})`;
}

export function padGroup(group: string): string {
  if (group.length < 4) {
    return `0{0,${4 - group.length}}${group}`;
  }

  return group;
}

export const ADDRESS_BOUNDARY = '[^A-Fa-f0-9:]';

export function simpleRegularExpression(groups: string[]) {
  const zeroIndexes: number[] = [];

  groups.forEach((group, i) => {
    const groupInteger = parseInt(group, 16);

    if (groupInteger === 0) {
      zeroIndexes.push(i);
    }
  });

  // You can technically elide a single 0, this creates the regular expressions
  // to match that eventuality
  const possibilities = zeroIndexes.map((zeroIndex) =>
    groups
      .map((group, i) => {
        if (i === zeroIndex) {
          const elision = i === 0 || i === v6.GROUPS - 1 ? ':' : '';

          return groupPossibilities([padGroup(group), elision]);
        }

        return padGroup(group);
      })
      .join(':'),
  );

  // The simplest case
  possibilities.push(groups.map(padGroup).join(':'));

  return groupPossibilities(possibilities);
}

export function possibleElisions(
  elidedGroups: number,
  moreLeft?: boolean,
  moreRight?: boolean,
): string {
  const left = moreLeft ? '' : ':';
  const right = moreRight ? '' : ':';

  const possibilities = [];

  // 1. elision of everything (::)
  if (!moreLeft && !moreRight) {
    possibilities.push('::');
  }

  // 2. complete elision of the middle
  if (moreLeft && moreRight) {
    possibilities.push('');
  }

  if ((moreRight && !moreLeft) || (!moreRight && moreLeft)) {
    // 3. complete elision of one side
    possibilities.push(':');
  }

  // 4. elision from the left side
  possibilities.push(`${left}(:0{1,4}){1,${elidedGroups - 1}}`);

  // 5. elision from the right side
  possibilities.push(`(0{1,4}:){1,${elidedGroups - 1}}${right}`);

  // 6. no elision
  possibilities.push(`(0{1,4}:){${elidedGroups - 1}}0{1,4}`);

  // 7. elision (including sloppy elision) from the middle
  for (let groups = 1; groups < elidedGroups - 1; groups++) {
    for (let position = 1; position < elidedGroups - groups; position++) {
      possibilities.push(
        `(0{1,4}:){${position}}:(0{1,4}:){${elidedGroups - position - groups - 1}}0{1,4}`,
      );
    }
  }

  return groupPossibilities(possibilities);
}
