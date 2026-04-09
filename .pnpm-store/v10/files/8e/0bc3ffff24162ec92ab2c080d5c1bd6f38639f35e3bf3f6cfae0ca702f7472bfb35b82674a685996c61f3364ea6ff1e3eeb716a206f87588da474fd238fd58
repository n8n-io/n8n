import { isPlainObject } from "./common";

export type WhereJSON = Record<string, unknown>;
export type WhereInput = WhereExpression | WhereJSON | null | undefined;

abstract class WhereExpressionBase {
  public abstract toJSON(): WhereJSON;

  public and(other: WhereInput): WhereExpression {
    const target = WhereExpression.from(other);
    if (!target) {
      return this as unknown as WhereExpression;
    }
    return AndWhere.combine(this as unknown as WhereExpression, target);
  }

  public or(other: WhereInput): WhereExpression {
    const target = WhereExpression.from(other);
    if (!target) {
      return this as unknown as WhereExpression;
    }
    return OrWhere.combine(this as unknown as WhereExpression, target);
  }
}

export abstract class WhereExpression extends WhereExpressionBase {
  public static from(input: WhereInput): WhereExpression | undefined {
    if (input instanceof WhereExpression) {
      return input;
    }
    if (input === null || input === undefined) {
      return undefined;
    }
    if (!isPlainObject(input)) {
      throw new TypeError(
        "Where input must be a WhereExpression or plain object",
      );
    }
    return parseWhereDict(input);
  }
}

class AndWhere extends WhereExpression {
  constructor(private readonly conditions: WhereExpression[]) {
    super();
  }

  public toJSON(): WhereJSON {
    return { $and: this.conditions.map((condition) => condition.toJSON()) };
  }

  public get operands(): WhereExpression[] {
    return this.conditions.slice();
  }

  public static combine(
    left: WhereExpression,
    right: WhereExpression,
  ): WhereExpression {
    const flattened: WhereExpression[] = [];

    const add = (expr: WhereExpression) => {
      if (expr instanceof AndWhere) {
        flattened.push(...expr.operands);
      } else {
        flattened.push(expr);
      }
    };

    add(left);
    add(right);

    if (flattened.length === 1) {
      return flattened[0];
    }

    return new AndWhere(flattened);
  }
}

class OrWhere extends WhereExpression {
  constructor(private readonly conditions: WhereExpression[]) {
    super();
  }

  public toJSON(): WhereJSON {
    return { $or: this.conditions.map((condition) => condition.toJSON()) };
  }

  public get operands(): WhereExpression[] {
    return this.conditions.slice();
  }

  public static combine(
    left: WhereExpression,
    right: WhereExpression,
  ): WhereExpression {
    const flattened: WhereExpression[] = [];

    const add = (expr: WhereExpression) => {
      if (expr instanceof OrWhere) {
        flattened.push(...expr.operands);
      } else {
        flattened.push(expr);
      }
    };

    add(left);
    add(right);

    if (flattened.length === 1) {
      return flattened[0];
    }

    return new OrWhere(flattened);
  }
}

class ComparisonWhere extends WhereExpression {
  constructor(
    private readonly key: string,
    private readonly operator: string,
    private readonly value: unknown,
  ) {
    super();
  }

  public toJSON(): WhereJSON {
    return {
      [this.key]: {
        [this.operator]: this.value,
      },
    };
  }
}

const comparisonOperatorMap = new Map<
  string,
  (key: string, value: unknown) => WhereExpression
>([
  ["$eq", (key, value) => new ComparisonWhere(key, "$eq", value)],
  ["$ne", (key, value) => new ComparisonWhere(key, "$ne", value)],
  ["$gt", (key, value) => new ComparisonWhere(key, "$gt", value)],
  ["$gte", (key, value) => new ComparisonWhere(key, "$gte", value)],
  ["$lt", (key, value) => new ComparisonWhere(key, "$lt", value)],
  ["$lte", (key, value) => new ComparisonWhere(key, "$lte", value)],
  ["$in", (key, value) => new ComparisonWhere(key, "$in", value)],
  ["$nin", (key, value) => new ComparisonWhere(key, "$nin", value)],
  ["$contains", (key, value) => new ComparisonWhere(key, "$contains", value)],
  [
    "$not_contains",
    (key, value) => new ComparisonWhere(key, "$not_contains", value),
  ],
  ["$regex", (key, value) => new ComparisonWhere(key, "$regex", value)],
  ["$not_regex", (key, value) => new ComparisonWhere(key, "$not_regex", value)],
]);

const parseWhereDict = (data: Record<string, unknown>): WhereExpression => {
  if ("$and" in data) {
    if (Object.keys(data).length !== 1) {
      throw new Error("$and cannot be combined with other keys");
    }
    const rawConditions = data["$and"];
    if (!Array.isArray(rawConditions) || rawConditions.length === 0) {
      throw new TypeError("$and must be a non-empty array");
    }
    const conditions = rawConditions.map((item, index) => {
      const expr = WhereExpression.from(item as WhereInput);
      if (!expr) {
        throw new TypeError(`Invalid where clause at index ${index}`);
      }
      return expr;
    });
    if (conditions.length === 1) {
      return conditions[0];
    }
    return conditions
      .slice(1)
      .reduce(
        (acc, condition) => AndWhere.combine(acc, condition),
        conditions[0],
      );
  }

  if ("$or" in data) {
    if (Object.keys(data).length !== 1) {
      throw new Error("$or cannot be combined with other keys");
    }
    const rawConditions = data["$or"];
    if (!Array.isArray(rawConditions) || rawConditions.length === 0) {
      throw new TypeError("$or must be a non-empty array");
    }
    const conditions = rawConditions.map((item, index) => {
      const expr = WhereExpression.from(item as WhereInput);
      if (!expr) {
        throw new TypeError(`Invalid where clause at index ${index}`);
      }
      return expr;
    });
    if (conditions.length === 1) {
      return conditions[0];
    }
    return conditions
      .slice(1)
      .reduce(
        (acc, condition) => OrWhere.combine(acc, condition),
        conditions[0],
      );
  }

  const entries = Object.entries(data);
  if (entries.length !== 1) {
    throw new Error("Where dictionary must contain exactly one field");
  }

  const [field, value] = entries[0];
  if (!isPlainObject(value)) {
    return new ComparisonWhere(field, "$eq", value);
  }

  const operatorEntries = Object.entries(value);
  if (operatorEntries.length !== 1) {
    throw new Error(
      `Operator dictionary for field "${field}" must contain exactly one operator`,
    );
  }

  const [operator, operand] = operatorEntries[0];
  const factory = comparisonOperatorMap.get(operator);
  if (!factory) {
    throw new Error(`Unsupported where operator: ${operator}`);
  }

  return factory(field, operand);
};

export const createComparisonWhere = (
  key: string,
  operator: string,
  value: unknown,
): WhereExpression => new ComparisonWhere(key, operator, value);
