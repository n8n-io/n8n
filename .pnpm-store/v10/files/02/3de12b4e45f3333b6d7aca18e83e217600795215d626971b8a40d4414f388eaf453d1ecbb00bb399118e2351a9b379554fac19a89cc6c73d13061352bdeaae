import type { SearchPayload } from "../../api";
import type { GroupByInput } from "./groupBy";
import { GroupBy } from "./groupBy";
import type { LimitInput } from "./limit";
import { Limit } from "./limit";
import type { RankInput } from "./rank";
import { RankExpression } from "./rank";
import type { SelectInput, SelectKeyInput } from "./select";
import { Select } from "./select";
import type { WhereInput } from "./where";
import { WhereExpression } from "./where";

interface SearchParts {
  where?: WhereExpression;
  rank?: RankExpression;
  groupBy?: GroupBy;
  limit: Limit;
  select: Select;
}

export interface SearchInit {
  where?: WhereInput;
  rank?: RankInput;
  groupBy?: GroupByInput;
  limit?: LimitInput;
  select?: SelectInput;
}

export class Search {
  private _where?: WhereExpression;
  private _rank?: RankExpression;
  private _groupBy?: GroupBy;
  private _limit: Limit;
  private _select: Select;

  constructor(init: SearchInit = {}) {
    this._where = init.where ? WhereExpression.from(init.where) : undefined;
    this._rank = init.rank ? RankExpression.from(init.rank) : undefined;
    this._groupBy = init.groupBy ? GroupBy.from(init.groupBy) : undefined;
    this._limit = Limit.from(init.limit ?? undefined);
    this._select = Select.from(init.select ?? undefined);
  }

  private clone(overrides: Partial<SearchParts>): Search {
    const next = Object.create(Search.prototype) as Search;
    next._where = overrides.where ?? this._where;
    next._rank = overrides.rank ?? this._rank;
    next._groupBy = overrides.groupBy ?? this._groupBy;
    next._limit = overrides.limit ?? this._limit;
    next._select = overrides.select ?? this._select;
    return next;
  }

  public where(where?: WhereInput): Search {
    return this.clone({ where: WhereExpression.from(where) });
  }

  public rank(rank?: RankInput): Search {
    return this.clone({ rank: RankExpression.from(rank ?? undefined) });
  }

  public groupBy(groupBy?: GroupByInput): Search {
    return this.clone({ groupBy: GroupBy.from(groupBy) });
  }

  public limit(limit?: LimitInput, offset?: number): Search {
    if (typeof limit === "number") {
      return this.clone({ limit: Limit.from(limit, offset) });
    }
    return this.clone({ limit: Limit.from(limit ?? undefined) });
  }

  public select(keys?: SelectInput): Search;
  public select(...keys: SelectKeyInput[]): Search;
  public select(
    first?: SelectInput | SelectKeyInput,
    ...rest: SelectKeyInput[]
  ): Search {
    if (Array.isArray(first) || first instanceof Set) {
      return this.clone({
        select: Select.from(first as Iterable<SelectKeyInput>),
      });
    }

    if (first instanceof Select) {
      return this.clone({ select: Select.from(first) });
    }

    if (typeof first === "object" && first !== null && "keys" in first) {
      return this.clone({ select: Select.from(first as SelectInput) });
    }

    const allKeys: SelectKeyInput[] = [];
    if (first !== undefined) {
      allKeys.push(first as SelectKeyInput);
    }
    if (rest.length) {
      allKeys.push(...rest);
    }

    return this.clone({ select: Select.from(allKeys) });
  }

  public selectAll(): Search {
    return this.clone({ select: Select.all() });
  }

  public get whereClause(): WhereExpression | undefined {
    return this._where;
  }

  public get rankExpression(): RankExpression | undefined {
    return this._rank;
  }

  public get groupByConfig(): GroupBy | undefined {
    return this._groupBy;
  }

  public get limitConfig(): Limit {
    return this._limit;
  }

  public get selectConfig(): Select {
    return this._select;
  }

  public toPayload(): SearchPayload {
    const payload: SearchPayload = {
      limit: this._limit.toJSON(),
      select: this._select.toJSON(),
    };

    if (this._where) {
      // toJSON returns the plain where-clause structure the service expects (no wrapper).
      // The generated SearchPayload type still says filter must look like { where_clause: … }.
      payload.filter =
        this._where.toJSON() as unknown as SearchPayload["filter"];
    }

    if (this._rank) {
      payload.rank = this._rank.toJSON();
    }

    if (this._groupBy) {
      payload.group_by = this._groupBy.toJSON();
    }

    return payload;
  }
}

export type SearchLike = Search | SearchInit;

export const toSearch = (input: SearchLike): Search =>
  input instanceof Search ? input : new Search(input);
