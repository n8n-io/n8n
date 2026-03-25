import { assertNonEmptyArray, iterableToArray, IterableInput } from "./common";
import { createComparisonWhere, WhereExpression } from "./where";

export class Key {
  public static readonly ID = new Key("#id");
  public static readonly DOCUMENT = new Key("#document");
  public static readonly EMBEDDING = new Key("#embedding");
  public static readonly METADATA = new Key("#metadata");
  public static readonly SCORE = new Key("#score");

  constructor(public readonly name: string) {}

  public eq(value: unknown): WhereExpression {
    return createComparisonWhere(this.name, "$eq", value);
  }

  public ne(value: unknown): WhereExpression {
    return createComparisonWhere(this.name, "$ne", value);
  }

  public gt(value: unknown): WhereExpression {
    return createComparisonWhere(this.name, "$gt", value);
  }

  public gte(value: unknown): WhereExpression {
    return createComparisonWhere(this.name, "$gte", value);
  }

  public lt(value: unknown): WhereExpression {
    return createComparisonWhere(this.name, "$lt", value);
  }

  public lte(value: unknown): WhereExpression {
    return createComparisonWhere(this.name, "$lte", value);
  }

  public isIn(values: IterableInput<unknown>): WhereExpression {
    const array = iterableToArray(values);
    assertNonEmptyArray(array, "$in requires at least one value");
    return createComparisonWhere(this.name, "$in", array);
  }

  public notIn(values: IterableInput<unknown>): WhereExpression {
    const array = iterableToArray(values);
    assertNonEmptyArray(array, "$nin requires at least one value");
    return createComparisonWhere(this.name, "$nin", array);
  }

  public contains(value: string): WhereExpression {
    if (typeof value !== "string") {
      throw new TypeError("$contains requires a string value");
    }
    return createComparisonWhere(this.name, "$contains", value);
  }

  public notContains(value: string): WhereExpression {
    if (typeof value !== "string") {
      throw new TypeError("$not_contains requires a string value");
    }
    return createComparisonWhere(this.name, "$not_contains", value);
  }

  public regex(pattern: string): WhereExpression {
    if (typeof pattern !== "string") {
      throw new TypeError("$regex requires a string pattern");
    }
    return createComparisonWhere(this.name, "$regex", pattern);
  }

  public notRegex(pattern: string): WhereExpression {
    if (typeof pattern !== "string") {
      throw new TypeError("$not_regex requires a string pattern");
    }
    return createComparisonWhere(this.name, "$not_regex", pattern);
  }
}

export interface KeyFactory {
  (name: string): Key;
  ID: Key;
  DOCUMENT: Key;
  EMBEDDING: Key;
  METADATA: Key;
  SCORE: Key;
}

const createKeyFactory = (): KeyFactory => {
  const factory = ((name: string) => new Key(name)) as KeyFactory;
  factory.ID = Key.ID;
  factory.DOCUMENT = Key.DOCUMENT;
  factory.EMBEDDING = Key.EMBEDDING;
  factory.METADATA = Key.METADATA;
  factory.SCORE = Key.SCORE;
  return factory;
};

export const K: KeyFactory = createKeyFactory();
