export interface LimitOptions {
  offset?: number;
  limit?: number | null | undefined;
}

export type LimitInput = Limit | number | LimitOptions | null | undefined;

export class Limit {
  public readonly offset: number;
  public readonly limit?: number;

  constructor(options: LimitOptions = {}) {
    const { offset = 0, limit } = options;

    if (!Number.isInteger(offset) || offset < 0) {
      throw new TypeError("Limit offset must be a non-negative integer");
    }

    if (limit !== null && limit !== undefined) {
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new TypeError("Limit must be a positive integer when provided");
      }
      this.limit = limit;
    }

    this.offset = offset;
  }

  public static from(input: LimitInput, offsetOverride?: number): Limit {
    if (input instanceof Limit) {
      return new Limit({ offset: input.offset, limit: input.limit });
    }

    if (typeof input === "number") {
      return new Limit({ limit: input, offset: offsetOverride ?? 0 });
    }

    if (input === null || input === undefined) {
      return new Limit();
    }

    if (typeof input === "object") {
      return new Limit(input as LimitOptions);
    }

    throw new TypeError("Invalid limit input");
  }

  public toJSON(): { offset: number; limit?: number } {
    const result: { offset: number; limit?: number } = { offset: this.offset };
    if (this.limit !== undefined) {
      result.limit = this.limit;
    }
    return result;
  }
}
