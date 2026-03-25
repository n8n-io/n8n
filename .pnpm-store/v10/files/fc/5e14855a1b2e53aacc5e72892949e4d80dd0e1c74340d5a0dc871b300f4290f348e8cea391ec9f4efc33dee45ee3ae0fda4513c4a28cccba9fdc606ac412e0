import { MongoInvalidArgumentError } from './error';

/** @public */
export type SortDirection =
  | 1
  | -1
  | 'asc'
  | 'desc'
  | 'ascending'
  | 'descending'
  | { $meta: string };

/** @public */
export type Sort =
  | string
  | Exclude<SortDirection, { $meta: string }>
  | string[]
  | { [key: string]: SortDirection }
  | Map<string, SortDirection>
  | [string, SortDirection][]
  | [string, SortDirection];

/** Below stricter types were created for sort that correspond with type that the cmd takes  */

/** @internal */
export type SortDirectionForCmd = 1 | -1 | { $meta: string };

/** @internal */
export type SortForCmd = Map<string, SortDirectionForCmd>;

/** @internal */
type SortPairForCmd = [string, SortDirectionForCmd];

/** @internal */
function prepareDirection(direction: any = 1): SortDirectionForCmd {
  const value = `${direction}`.toLowerCase();
  if (isMeta(direction)) return direction;
  switch (value) {
    case 'ascending':
    case 'asc':
    case '1':
      return 1;
    case 'descending':
    case 'desc':
    case '-1':
      return -1;
    default:
      throw new MongoInvalidArgumentError(`Invalid sort direction: ${JSON.stringify(direction)}`);
  }
}

/** @internal */
function isMeta(t: SortDirection): t is { $meta: string } {
  return typeof t === 'object' && t != null && '$meta' in t && typeof t.$meta === 'string';
}

/** @internal */
function isPair(t: Sort): t is [string, SortDirection] {
  if (Array.isArray(t) && t.length === 2) {
    try {
      prepareDirection(t[1]);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function isDeep(t: Sort): t is [string, SortDirection][] {
  return Array.isArray(t) && Array.isArray(t[0]);
}

function isMap(t: Sort): t is Map<string, SortDirection> {
  return t instanceof Map && t.size > 0;
}

/** @internal */
function pairToMap(v: [string, SortDirection]): SortForCmd {
  return new Map([[`${v[0]}`, prepareDirection([v[1]])]]);
}

/** @internal */
function deepToMap(t: [string, SortDirection][]): SortForCmd {
  const sortEntries: SortPairForCmd[] = t.map(([k, v]) => [`${k}`, prepareDirection(v)]);
  return new Map(sortEntries);
}

/** @internal */
function stringsToMap(t: string[]): SortForCmd {
  const sortEntries: SortPairForCmd[] = t.map(key => [`${key}`, 1]);
  return new Map(sortEntries);
}

/** @internal */
function objectToMap(t: { [key: string]: SortDirection }): SortForCmd {
  const sortEntries: SortPairForCmd[] = Object.entries(t).map(([k, v]) => [
    `${k}`,
    prepareDirection(v)
  ]);
  return new Map(sortEntries);
}

/** @internal */
function mapToMap(t: Map<string, SortDirection>): SortForCmd {
  const sortEntries: SortPairForCmd[] = Array.from(t).map(([k, v]) => [
    `${k}`,
    prepareDirection(v)
  ]);
  return new Map(sortEntries);
}

/** converts a Sort type into a type that is valid for the server (SortForCmd) */
export function formatSort(
  sort: Sort | undefined,
  direction?: SortDirection
): SortForCmd | undefined {
  if (sort == null) return undefined;
  if (typeof sort === 'string') return new Map([[sort, prepareDirection(direction)]]);
  if (typeof sort !== 'object') {
    throw new MongoInvalidArgumentError(
      `Invalid sort format: ${JSON.stringify(sort)} Sort must be a valid object`
    );
  }
  if (!Array.isArray(sort)) {
    return isMap(sort) ? mapToMap(sort) : Object.keys(sort).length ? objectToMap(sort) : undefined;
  }
  if (!sort.length) return undefined;
  if (isDeep(sort)) return deepToMap(sort);
  if (isPair(sort)) return pairToMap(sort);
  return stringsToMap(sort);
}
