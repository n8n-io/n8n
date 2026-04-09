import { isPlainObject } from "./common";
import { Key } from "./key";

export interface MinKJSON {
  keys: string[];
  k: number;
}

export interface MaxKJSON {
  keys: string[];
  k: number;
}

export type AggregateJSON = { $min_k: MinKJSON } | { $max_k: MaxKJSON };

export type AggregateInput = Aggregate | AggregateJSON;

export abstract class Aggregate {
  public abstract toJSON(): AggregateJSON;

  public static from(input: AggregateInput): Aggregate {
    if (input instanceof Aggregate) {
      return input;
    }
    if (isPlainObject(input)) {
      if ("$min_k" in input) {
        const data = input.$min_k as MinKJSON;
        return new MinK(
          data.keys.map((k) => new Key(k)),
          data.k,
        );
      }
      if ("$max_k" in input) {
        const data = input.$max_k as MaxKJSON;
        return new MaxK(
          data.keys.map((k) => new Key(k)),
          data.k,
        );
      }
    }
    throw new TypeError(
      "Aggregate input must be an Aggregate instance or object with $min_k or $max_k",
    );
  }

  public static minK(keys: (Key | string)[], k: number): MinK {
    return new MinK(
      keys.map((key) => (key instanceof Key ? key : new Key(key))),
      k,
    );
  }

  public static maxK(keys: (Key | string)[], k: number): MaxK {
    return new MaxK(
      keys.map((key) => (key instanceof Key ? key : new Key(key))),
      k,
    );
  }
}

export class MinK extends Aggregate {
  constructor(public readonly keys: Key[], public readonly k: number) {
    super();
    if (keys.length === 0) {
      throw new Error("MinK keys cannot be empty");
    }
    if (k <= 0) {
      throw new Error("MinK k must be positive");
    }
  }

  public toJSON(): AggregateJSON {
    return {
      $min_k: {
        keys: this.keys.map((key) => key.name),
        k: this.k,
      },
    };
  }
}

export class MaxK extends Aggregate {
  constructor(public readonly keys: Key[], public readonly k: number) {
    super();
    if (keys.length === 0) {
      throw new Error("MaxK keys cannot be empty");
    }
    if (k <= 0) {
      throw new Error("MaxK k must be positive");
    }
  }

  public toJSON(): AggregateJSON {
    return {
      $max_k: {
        keys: this.keys.map((key) => key.name),
        k: this.k,
      },
    };
  }
}

export interface GroupByJSON {
  keys: string[];
  aggregate: AggregateJSON;
}

export type GroupByInput = GroupBy | GroupByJSON;

export class GroupBy {
  constructor(
    public readonly keys: Key[],
    public readonly aggregate: Aggregate,
  ) {
    if (keys.length === 0) {
      throw new Error("GroupBy keys cannot be empty");
    }
  }

  public static from(input: GroupByInput | undefined): GroupBy | undefined {
    if (input === undefined || input === null) {
      return undefined;
    }
    if (input instanceof GroupBy) {
      return input;
    }
    if (isPlainObject(input)) {
      const data = input as GroupByJSON;
      if (!data.keys || !Array.isArray(data.keys)) {
        throw new TypeError("GroupBy requires 'keys' array");
      }
      if (!data.aggregate) {
        throw new TypeError("GroupBy requires 'aggregate'");
      }
      return new GroupBy(
        data.keys.map((k) => new Key(k)),
        Aggregate.from(data.aggregate),
      );
    }
    throw new TypeError(
      "GroupBy input must be a GroupBy instance or plain object",
    );
  }

  public toJSON(): GroupByJSON {
    return {
      keys: this.keys.map((key) => key.name),
      aggregate: this.aggregate.toJSON(),
    };
  }
}
