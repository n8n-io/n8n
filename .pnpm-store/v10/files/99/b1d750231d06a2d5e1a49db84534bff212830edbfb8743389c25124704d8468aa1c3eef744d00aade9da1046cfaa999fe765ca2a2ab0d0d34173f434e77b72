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

  /**
   * Contains filter.
   *
   * On `Key.DOCUMENT`: substring search (value must be a string).
   * On metadata fields: checks if the array field contains the scalar value.
   *
   * @example
   * K.DOCUMENT.contains("machine learning")   // document substring
   * K("tags").contains("action")               // metadata array contains
   * K("scores").contains(42)                   // metadata array contains
   */
  public contains(value: string | number | boolean): WhereExpression {
    if (this.name === "#document" && typeof value !== "string") {
      throw new TypeError("K.DOCUMENT.contains requires a string value");
    }
    return createComparisonWhere(this.name, "$contains", value);
  }

  /**
   * Not-contains filter.
   *
   * On `Key.DOCUMENT`: excludes documents containing the substring.
   * On metadata fields: checks that the array field does not contain the scalar value.
   *
   * @example
   * K.DOCUMENT.notContains("deprecated")   // document substring exclusion
   * K("tags").notContains("draft")          // metadata array not-contains
   */
  public notContains(value: string | number | boolean): WhereExpression {
    if (this.name === "#document" && typeof value !== "string") {
      throw new TypeError("K.DOCUMENT.notContains requires a string value");
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
