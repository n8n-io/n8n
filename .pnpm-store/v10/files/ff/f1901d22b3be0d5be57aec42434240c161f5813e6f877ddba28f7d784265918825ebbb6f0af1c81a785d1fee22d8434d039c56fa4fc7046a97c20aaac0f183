import type { SparseVector } from "../../api";
import { deepClone, isPlainObject, IterableInput } from "./common";
import { Key } from "./key";

export type RankLiteral = Record<string, unknown>;
export type RankInput =
  | RankExpression
  | RankLiteral
  | number
  | null
  | undefined;

const requireNumber = (value: unknown, message: string): number => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    throw new TypeError(message);
  }
  return value;
};

abstract class RankExpressionBase {
  public abstract toJSON(): Record<string, unknown>;

  public add(...others: RankInput[]): RankExpression {
    if (others.length === 0) {
      return this as unknown as RankExpression;
    }
    const expressions = [
      this as unknown as RankExpression,
      ...others.map((item, index) => requireRank(item, `add operand ${index}`)),
    ];
    return SumRankExpression.create(expressions);
  }

  public subtract(other: RankInput): RankExpression {
    return new SubRankExpression(
      this as unknown as RankExpression,
      requireRank(other, "subtract operand"),
    );
  }

  public multiply(...others: RankInput[]): RankExpression {
    if (others.length === 0) {
      return this as unknown as RankExpression;
    }
    const expressions = [
      this as unknown as RankExpression,
      ...others.map((item, index) =>
        requireRank(item, `multiply operand ${index}`),
      ),
    ];
    return MulRankExpression.create(expressions);
  }

  public divide(other: RankInput): RankExpression {
    return new DivRankExpression(
      this as unknown as RankExpression,
      requireRank(other, "divide operand"),
    );
  }

  public negate(): RankExpression {
    return this.multiply(-1);
  }

  public abs(): RankExpression {
    return new AbsRankExpression(this as unknown as RankExpression);
  }

  public exp(): RankExpression {
    return new ExpRankExpression(this as unknown as RankExpression);
  }

  public log(): RankExpression {
    return new LogRankExpression(this as unknown as RankExpression);
  }

  public max(...others: RankInput[]): RankExpression {
    if (others.length === 0) {
      return this as unknown as RankExpression;
    }
    const expressions = [
      this as unknown as RankExpression,
      ...others.map((item, index) => requireRank(item, `max operand ${index}`)),
    ];
    return MaxRankExpression.create(expressions);
  }

  public min(...others: RankInput[]): RankExpression {
    if (others.length === 0) {
      return this as unknown as RankExpression;
    }
    const expressions = [
      this as unknown as RankExpression,
      ...others.map((item, index) => requireRank(item, `min operand ${index}`)),
    ];
    return MinRankExpression.create(expressions);
  }
}

export abstract class RankExpression extends RankExpressionBase {
  public static from(input: RankInput): RankExpression | undefined {
    if (input instanceof RankExpression) {
      return input;
    }
    if (input === null || input === undefined) {
      return undefined;
    }
    if (typeof input === "number") {
      return new ValueRankExpression(input);
    }
    if (isPlainObject(input)) {
      return new RawRankExpression(input);
    }
    throw new TypeError(
      "Rank input must be a RankExpression, number, or plain object",
    );
  }
}

class RawRankExpression extends RankExpression {
  constructor(private readonly raw: RankLiteral) {
    super();
  }

  public toJSON(): RankLiteral {
    return deepClone(this.raw);
  }
}

class ValueRankExpression extends RankExpression {
  constructor(private readonly value: number) {
    super();
  }

  public toJSON(): RankLiteral {
    return { $val: this.value };
  }
}

class SumRankExpression extends RankExpression {
  constructor(private readonly ranks: RankExpression[]) {
    super();
  }

  public static create(ranks: RankExpression[]): RankExpression {
    const flattened: RankExpression[] = [];
    for (const rank of ranks) {
      if (rank instanceof SumRankExpression) {
        flattened.push(...rank.operands);
      } else {
        flattened.push(rank);
      }
    }
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new SumRankExpression(flattened);
  }

  public get operands(): RankExpression[] {
    return this.ranks.slice();
  }

  public toJSON(): RankLiteral {
    return { $sum: this.ranks.map((rank) => rank.toJSON()) };
  }
}

class SubRankExpression extends RankExpression {
  constructor(
    private readonly left: RankExpression,
    private readonly right: RankExpression,
  ) {
    super();
  }

  public toJSON(): RankLiteral {
    return {
      $sub: {
        left: this.left.toJSON(),
        right: this.right.toJSON(),
      },
    };
  }
}

class MulRankExpression extends RankExpression {
  constructor(private readonly ranks: RankExpression[]) {
    super();
  }

  public static create(ranks: RankExpression[]): RankExpression {
    const flattened: RankExpression[] = [];
    for (const rank of ranks) {
      if (rank instanceof MulRankExpression) {
        flattened.push(...rank.operands);
      } else {
        flattened.push(rank);
      }
    }
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new MulRankExpression(flattened);
  }

  public get operands(): RankExpression[] {
    return this.ranks.slice();
  }

  public toJSON(): RankLiteral {
    return { $mul: this.ranks.map((rank) => rank.toJSON()) };
  }
}

class DivRankExpression extends RankExpression {
  constructor(
    private readonly left: RankExpression,
    private readonly right: RankExpression,
  ) {
    super();
  }

  public toJSON(): RankLiteral {
    return {
      $div: {
        left: this.left.toJSON(),
        right: this.right.toJSON(),
      },
    };
  }
}

class AbsRankExpression extends RankExpression {
  constructor(private readonly operand: RankExpression) {
    super();
  }

  public toJSON(): RankLiteral {
    return { $abs: this.operand.toJSON() };
  }
}

class ExpRankExpression extends RankExpression {
  constructor(private readonly operand: RankExpression) {
    super();
  }

  public toJSON(): RankLiteral {
    return { $exp: this.operand.toJSON() };
  }
}

class LogRankExpression extends RankExpression {
  constructor(private readonly operand: RankExpression) {
    super();
  }

  public toJSON(): RankLiteral {
    return { $log: this.operand.toJSON() };
  }
}

class MaxRankExpression extends RankExpression {
  constructor(private readonly ranks: RankExpression[]) {
    super();
  }

  public static create(ranks: RankExpression[]): RankExpression {
    const flattened: RankExpression[] = [];
    for (const rank of ranks) {
      if (rank instanceof MaxRankExpression) {
        flattened.push(...rank.operands);
      } else {
        flattened.push(rank);
      }
    }
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new MaxRankExpression(flattened);
  }

  public get operands(): RankExpression[] {
    return this.ranks.slice();
  }

  public toJSON(): RankLiteral {
    return { $max: this.ranks.map((rank) => rank.toJSON()) };
  }
}

class MinRankExpression extends RankExpression {
  constructor(private readonly ranks: RankExpression[]) {
    super();
  }

  public static create(ranks: RankExpression[]): RankExpression {
    const flattened: RankExpression[] = [];
    for (const rank of ranks) {
      if (rank instanceof MinRankExpression) {
        flattened.push(...rank.operands);
      } else {
        flattened.push(rank);
      }
    }
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new MinRankExpression(flattened);
  }

  public get operands(): RankExpression[] {
    return this.ranks.slice();
  }

  public toJSON(): RankLiteral {
    return { $min: this.ranks.map((rank) => rank.toJSON()) };
  }
}

class KnnRankExpression extends RankExpression {
  constructor(private readonly config: KnnOptionsNormalized) {
    super();
  }

  public toJSON(): RankLiteral {
    const base: Record<string, unknown> = {
      query: this.config.query,
      key: this.config.key,
      limit: this.config.limit,
    };

    if (this.config.defaultValue !== undefined) {
      base.default = this.config.defaultValue;
    }

    if (this.config.returnRank) {
      base.return_rank = true;
    }

    return { $knn: base };
  }
}

interface KnnOptionsNormalized {
  query: number[] | SparseVector | string;
  key: string;
  limit: number;
  defaultValue?: number;
  returnRank: boolean;
}

export interface KnnOptions {
  query: IterableInput<number> | SparseVector | string;
  key?: string | Key;
  limit?: number;
  default?: number | null;
  returnRank?: boolean;
}

const normalizeDenseVector = (vector: IterableInput<number>): number[] => {
  if (Array.isArray(vector)) {
    return vector.slice();
  }
  return Array.from(vector as Iterable<number>, (value) => {
    if (
      typeof value !== "number" ||
      Number.isNaN(value) ||
      !Number.isFinite(value)
    ) {
      throw new TypeError("Dense query vector values must be finite numbers");
    }
    return value;
  });
};

const normalizeKnnOptions = (options: KnnOptions): KnnOptionsNormalized => {
  const limit = options.limit ?? 128;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError("Knn limit must be a positive integer");
  }

  const queryInput = options.query;

  let query: number[] | SparseVector | string;
  if (typeof queryInput === "string") {
    query = queryInput;
  } else if (
    isPlainObject(queryInput) &&
    Array.isArray((queryInput as SparseVector).indices) &&
    Array.isArray((queryInput as SparseVector).values)
  ) {
    const sparse = queryInput as SparseVector;
    query = {
      indices: sparse.indices.slice(),
      values: sparse.values.slice(),
    };
  } else {
    query = normalizeDenseVector(queryInput as IterableInput<number>);
  }

  const key =
    options.key instanceof Key ? options.key.name : options.key ?? "#embedding";
  if (typeof key !== "string") {
    throw new TypeError("Knn key must be a string or Key instance");
  }

  const defaultValue =
    options.default === null || options.default === undefined
      ? undefined
      : requireNumber(options.default, "Knn default must be a number");

  if (defaultValue !== undefined && !Number.isFinite(defaultValue)) {
    throw new TypeError("Knn default must be a finite number");
  }

  return {
    query:
      Array.isArray(query) || typeof query === "string"
        ? query
        : deepClone(query),
    key,
    limit,
    defaultValue,
    returnRank: options.returnRank ?? false,
  };
};

const requireRank = (input: RankInput, context: string): RankExpression => {
  const result = RankExpression.from(input);
  if (!result) {
    throw new TypeError(`${context} must be a rank expression`);
  }
  return result;
};

export const Val = (value: number): RankExpression =>
  new ValueRankExpression(requireNumber(value, "Val requires a numeric value"));

export const Knn = (options: KnnOptions): RankExpression =>
  new KnnRankExpression(normalizeKnnOptions(options));

export interface RrfOptions {
  ranks: RankInput[];
  k?: number;
  weights?: number[];
  normalize?: boolean;
}

export const Rrf = ({
  ranks,
  k = 60,
  weights,
  normalize = false,
}: RrfOptions): RankExpression => {
  if (!Number.isInteger(k) || k <= 0) {
    throw new TypeError("Rrf k must be a positive integer");
  }
  if (!Array.isArray(ranks) || ranks.length === 0) {
    throw new TypeError("Rrf requires at least one rank expression");
  }

  const expressions = ranks.map((rank, index) =>
    requireRank(rank, `ranks[${index}]`),
  );

  let weightValues = weights
    ? weights.slice()
    : new Array(expressions.length).fill(1);
  if (weightValues.length !== expressions.length) {
    throw new Error("Number of weights must match number of ranks");
  }
  if (weightValues.some((value) => typeof value !== "number" || value < 0)) {
    throw new TypeError("Weights must be non-negative numbers");
  }

  if (normalize) {
    const total = weightValues.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      throw new Error(
        "Weights must sum to a positive value when normalize=true",
      );
    }
    weightValues = weightValues.map((value) => value / total);
  }

  const terms = expressions.map((rank, index) => {
    const weight = weightValues[index];
    const numerator = Val(weight);
    const denominator = rank.add(k);
    return numerator.divide(denominator);
  });

  const fused = terms.reduce((acc, term) => acc.add(term));
  return fused.negate();
};

export const Sum = (...inputs: RankInput[]): RankExpression => {
  if (inputs.length === 0) {
    throw new Error("Sum requires at least one rank expression");
  }
  const expressions = inputs.map((rank, index) =>
    requireRank(rank, `Sum operand ${index}`),
  );
  return SumRankExpression.create(expressions);
};

export const Sub = (left: RankInput, right: RankInput): RankExpression =>
  new SubRankExpression(
    requireRank(left, "Sub left"),
    requireRank(right, "Sub right"),
  );

export const Mul = (...inputs: RankInput[]): RankExpression => {
  if (inputs.length === 0) {
    throw new Error("Mul requires at least one rank expression");
  }
  const expressions = inputs.map((rank, index) =>
    requireRank(rank, `Mul operand ${index}`),
  );
  return MulRankExpression.create(expressions);
};

export const Div = (left: RankInput, right: RankInput): RankExpression =>
  new DivRankExpression(
    requireRank(left, "Div left"),
    requireRank(right, "Div right"),
  );

export const Abs = (input: RankInput): RankExpression =>
  requireRank(input, "Abs").abs();

export const Exp = (input: RankInput): RankExpression =>
  requireRank(input, "Exp").exp();

export const Log = (input: RankInput): RankExpression =>
  requireRank(input, "Log").log();

export const Max = (...inputs: RankInput[]): RankExpression => {
  if (inputs.length === 0) {
    throw new Error("Max requires at least one rank expression");
  }
  const expressions = inputs.map((rank, index) =>
    requireRank(rank, `Max operand ${index}`),
  );
  return MaxRankExpression.create(expressions);
};

export const Min = (...inputs: RankInput[]): RankExpression => {
  if (inputs.length === 0) {
    throw new Error("Min requires at least one rank expression");
  }
  const expressions = inputs.map((rank, index) =>
    requireRank(rank, `Min operand ${index}`),
  );
  return MinRankExpression.create(expressions);
};
